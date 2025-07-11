import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  PawPrint, 
  Calendar, 
  Key, 
  ShoppingBag, 
  Users, 
  Bell,
  CreditCard,
  Crown,
  Building,
  MapPin,
  History,
  Package,
  LogOut,
  CheckCircle,
  Plus
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionButton } from '../components/SubscriptionButton';
import { DogCard, DogEditModal } from '../components/dashboard/DogCard';
import { ParkCard } from '../components/dashboard/ParkCard';
import { ParkModal } from '../components/dashboard/ParkModal';
import { ReservationCard } from '../components/dashboard/ReservationCard';
import { NotificationCard } from '../components/dashboard/NotificationCard';
import { StatCard } from '../components/dashboard/StatCard';
import VaccineBadge, { getVaccineStatusFromDog } from '../components/VaccineBadge';
import { validateVaccineFile } from '../utils/vaccineUpload';
import { handleVaccineUploadFixed } from '../utils/vaccineUploadFixed';
import type { Dog, DogPark, Profile, Reservation, Notification, NewsAnnouncement } from '../types';

export function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // デバッグログ
  console.log('UserDashboard rendered');
  console.log('User details:', user);
  console.log('User ID:', user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [ownedParks, setOwnedParks] = useState<DogPark[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isActive: hasSubscription } = useSubscription();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectedPark, setSelectedPark] = useState<DogPark | null>(null);
  const [showParkModal, setShowParkModal] = useState(false);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDogEditModal, setShowDogEditModal] = useState(false);
  const [isUpdatingDog, setIsUpdatingDog] = useState(false);
  const [dogUpdateError, setDogUpdateError] = useState('');
  const [dogUpdateSuccess, setDogUpdateSuccess] = useState('');
  const [dogFormData, setDogFormData] = useState({
    name: '',
    breed: '',
    gender: '',
    birthDate: '',
  });
  const [dogImageFile, setDogImageFile] = useState<File | null>(null);
  const [dogImagePreview, setDogImagePreview] = useState<string | null>(null);
  const [recentDogs, setRecentDogs] = useState<Dog[]>([]);
  const [recentDogsError, setRecentDogsError] = useState<string | null>(null);
  // ワクチン証明書関連の状態（初期値を空文字で統一）
  const [rabiesVaccineFile, setRabiesVaccineFile] = useState<File | null>(null);
  const [comboVaccineFile, setComboVaccineFile] = useState<File | null>(null);
  const [rabiesExpiryDate, setRabiesExpiryDate] = useState('');
  const [comboExpiryDate, setComboExpiryDate] = useState('');
  
  // 削除関連の状態
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    console.log('UserDashboard useEffect triggered');
    console.log('User exists:', !!user);
    
    if (user) {
      console.log('User authenticated, fetching dashboard data...');
      fetchDashboardData();
    }
    
    // 最近仲間入りしたワンちゃんを取得（誰でも閲覧可能）
    const fetchRecentDogs = async () => {
      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) {
        setRecentDogsError(error.message || 'データ取得エラー');
      } else {
        setRecentDogs(data || []);
        setRecentDogsError(null);
      }
    };
    fetchRecentDogs();
    
    // Check for success parameter in URL
    if (location.search.includes('success=true')) {
      setShowSuccessMessage(true);
      // Remove the query parameter
      window.history.replaceState({}, document.title, location.pathname);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [user, navigate, location]);

  const fetchDashboardData = async () => {
    try {
      // 一時的にデバッグ情報を表示
      console.log('User ID:', user?.id);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      
      console.log('Starting data fetch...');
      console.log('Querying dogs for user_id:', user?.id);
      
      // 全てのデータを一度に取得
      console.log('Fetching all data...');
      const [
        profileResponse,
        dogsResponse,
        parksResponse,
        reservationsResponse,
        notificationsResponse,
        newsResponse
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single(),
        
        supabase
          .from('dogs')
          .select('*, vaccine_certifications(*)')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('dog_parks')
          .select('*')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('reservations')
          .select('*, dog_park:dog_parks(*), dog:dogs(*)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user?.id)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('news_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      console.log('Data fetch completed, checking results...');
      
      if (profileResponse.error) {
        console.error('Profile error:', profileResponse.error);
        throw profileResponse.error;
      }
      if (dogsResponse.error) {
        console.error('Dogs error:', dogsResponse.error);
        throw dogsResponse.error;
      }
      if (parksResponse.error) {
        console.error('Parks error:', parksResponse.error);
        throw parksResponse.error;
      }
      if (reservationsResponse.error) {
        console.error('Reservations error:', reservationsResponse.error);
        throw reservationsResponse.error;
      }
      if (notificationsResponse.error) {
        console.error('Notifications error:', notificationsResponse.error);
        throw notificationsResponse.error;
      }
      if (newsResponse.error) {
        console.error('News error:', newsResponse.error);
        throw newsResponse.error;
      }

      console.log('Dogs response:', dogsResponse);
      console.log('Dogs data:', dogsResponse.data);
      console.log('Dogs count:', dogsResponse.data?.length);
      
      // 犬が0件の場合、データベースから全体のデータを確認
      if (dogsResponse.data?.length === 0) {
        console.log('No dogs found for user. Checking if any dogs exist...');
        
        // 認証状態と user ID を詳しく確認
        console.log('=== DETAILED AUTH DEBUG ===');
        console.log('User object:', user);
        console.log('User ID:', user?.id);
        console.log('User ID type:', typeof user?.id);
        
        // Supabase認証状態を確認
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log('Supabase auth data:', authData);
        console.log('Supabase auth error:', authError);
        
        // auth.uid()の値を確認
        const { data: authUidResult, error: authUidError } = await supabase
          .rpc('get_current_user_id');
        console.log('auth.uid() result:', authUidResult);
        console.log('auth.uid() error:', authUidError);
        
        // まず、現在のユーザーのプロフィールが取得できるかテスト
        console.log('Testing profile access...');
        const { data: profileTest, error: profileTestError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', user?.id)
          .single();
        
        console.log('Profile test result:', { data: profileTest, error: profileTestError });
        
        // 全体の犬のデータを確認（管理者として）
        const { data: allDogs, error: allDogsError } = await supabase
          .from('dogs')
          .select('id, name, owner_id')
          .limit(10);
        
        if (allDogsError) {
          console.error('Error fetching all dogs:', allDogsError);
        } else {
          console.log('All dogs in database (first 10):', allDogs);
          console.log('Current user ID:', user?.id);
          console.log('Connected to Supabase project:', import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]);
          
          // 各犬のowner_idと現在のユーザーIDを比較
          if (allDogs && allDogs.length > 0) {
            console.log('=== OWNER ID COMPARISON ===');
            allDogs.forEach((dog, index) => {
              console.log(`Dog ${index + 1}:`, {
                dogId: dog.id,
                dogName: dog.name,
                ownerId: dog.owner_id,
                ownerIdType: typeof dog.owner_id,
                currentUserId: user?.id,
                currentUserIdType: typeof user?.id,
                matches: dog.owner_id === user?.id,
                matchesString: dog.owner_id?.toString() === user?.id,
                matchesFromString: user?.id?.toString() === dog.owner_id,
              });
            });
          }
        }
      }

      setProfile(profileResponse.data);
      setDogs(dogsResponse.data || []);
      setOwnedParks(parksResponse.data || []);
      setRecentReservations(reservationsResponse.data || []);
      setNotifications(notificationsResponse.data || []);
      setNews(newsResponse.data || []);
      
      // デバッグ: 取得したdog情報（特にimage_url）の詳細を表示
      console.log('🐕 === DOG IMAGE DEBUG ===');
      dogsResponse.data?.forEach((dog, index) => {
        console.log(`Dog ${index + 1} (${dog.name}):`, {
          id: dog.id,
          name: dog.name,
          image_url: dog.image_url,
          image_url_type: typeof dog.image_url,
          image_url_length: dog.image_url?.length || 0,
          has_image: !!dog.image_url
        });
        
        // ニケちゃんの場合、ストレージのファイルパスと比較
        if (dog.name === 'ニケ' || dog.id === 'ae1439a1-e741-4518-a3af-cddb19ac526f') {
          console.log('🔍 ニケちゃんの詳細情報:', {
            id: dog.id,
            name: dog.name,
            current_image_url: dog.image_url,
            expected_storage_path_1: `${dog.id}/profile_174943206070.jpg`,
            expected_storage_path_2: `${dog.id}/profile_175206817428_bu...`,
            expected_public_url_1: `https://nmclwelnijcovptafjuq.supabase.co/storage/v1/object/public/dog-images/${dog.id}/profile_174943206070.jpg`,
            expected_public_url_2: `https://nmclwelnijcovptafjuq.supabase.co/storage/v1/object/public/dog-images/${dog.id}/profile_175206817428_bu...`
          });
        }
      });
      
      console.log('State updated successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // 一時的にエラーを画面に表示
      alert(`データ取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleParkSelect = (park: DogPark) => {
    setSelectedPark(park);
    setShowParkModal(true);
  };

  const handleDogSelect = (dog: Dog) => {
    setSelectedDog(dog);
    
    // デバッグ: 選択されたdog情報を表示
    console.log('🐕 Selected dog for editing:', {
      id: dog.id,
      name: dog.name,
      current_image_url: dog.image_url,
      image_url_type: typeof dog.image_url,
      has_image: !!dog.image_url
    });
    
    // Format the birth date to YYYY-MM-DD for the input field
    const birthDate = new Date(dog.birth_date).toISOString().split('T')[0];
    setDogFormData({
      name: dog.name,
      breed: dog.breed,
      gender: dog.gender,
      birthDate: birthDate,
    });
    setDogImagePreview(dog.image_url || null);
    
    // ワクチン証明書の情報を設定（必ず空文字で初期化）
    const cert = dog.vaccine_certifications?.[0];
    setRabiesExpiryDate(cert?.rabies_expiry_date || '');
    setComboExpiryDate(cert?.combo_expiry_date || '');
    
    setShowDogEditModal(true);
  };

  const handleDogImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('🔍 File selected:', file ? {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      isFileObject: file instanceof File
    } : 'No file selected');
    
    if (file) {
      try {
        // より厳密なファイル検証
        if (!(file instanceof File)) {
          setDogUpdateError('有効なファイルを選択してください。');
          return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
          setDogUpdateError('ファイルサイズは10MB以下にしてください。');
          return;
        }
        
        if (!file.type || !file.type.startsWith('image/')) {
          setDogUpdateError(`画像ファイルを選択してください。選択されたファイルタイプ: ${file.type}`);
          return;
        }

        // 許可されている画像形式を確認
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setDogUpdateError(`サポートされていない画像形式です: ${file.type}`);
          return;
        }

        setDogImageFile(file);
        console.log('✅ Dog image file set successfully:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
        
        // プレビュー画像を作成
        const reader = new FileReader();
        reader.onload = (e) => {
          setDogImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setDogUpdateError('');
      } catch (error) {
        console.error('Image processing error:', error);
        setDogUpdateError('画像の処理に失敗しました。別の画像をお試しください。');
      }
    }
  };

  const handleDogImageRemove = async () => {
    if (!selectedDog || !selectedDog.image_url) return;
    
    try {
      setIsUpdatingDog(true);
      setDogUpdateError('');
      
      // 1. Supabase Storageから画像ファイルを削除
      try {
        const url = new URL(selectedDog.image_url);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const filePath = `${selectedDog.id}/${fileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('dog-images')
          .remove([filePath]);
        
        if (storageError) {
          console.warn('Warning: Could not delete image from storage:', storageError);
          // ストレージ削除エラーは警告として扱い、DB更新は続行
        }
      } catch (storageErr) {
        console.warn('Warning: Error processing image deletion:', storageErr);
      }
      
      // 2. データベースのimage_urlをnullに更新
      const { error: dbError } = await supabase
        .from('dogs')
        .update({ image_url: null })
        .eq('id', selectedDog.id);
      
      if (dbError) {
        console.error('Error updating dog image_url:', dbError);
        setDogUpdateError('画像の削除に失敗しました。');
        return;
      }
      
      // 3. UIを更新
      setDogImageFile(null);
      setDogImagePreview(null);
      setSelectedDog({ ...selectedDog, image_url: undefined });
      
      // 4. データを再取得
      await fetchDashboardData();
      
      console.log('✅ Dog image removed successfully');
      setDogUpdateSuccess('画像を削除しました。');
      
      // 成功メッセージをクリア
      setTimeout(() => {
        setDogUpdateSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error removing dog image:', error);
      setDogUpdateError('画像の削除に失敗しました。');
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const handleRabiesVaccineSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 新しいユーティリティを使用したファイル検証
        const validation = validateVaccineFile(file);
        if (!validation.isValid) {
          setDogUpdateError(validation.error || 'ファイルの検証に失敗しました');
          return;
        }
        
        setRabiesVaccineFile(file);
        setDogUpdateError('');
        console.log('✅ Rabies vaccine file selected:', file.name);
      } catch (error) {
        console.error('Vaccine image processing error:', error);
        setDogUpdateError('ワクチン証明書の処理に失敗しました。別の画像をお試しください。');
      }
    } else {
      setRabiesVaccineFile(null);
      setDogUpdateError('');
    }
  };

  const handleComboVaccineSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 新しいユーティリティを使用したファイル検証
        const validation = validateVaccineFile(file);
        if (!validation.isValid) {
          setDogUpdateError(validation.error || 'ファイルの検証に失敗しました');
          return;
        }
        
        setComboVaccineFile(file);
        setDogUpdateError('');
        console.log('✅ Combo vaccine file selected:', file.name);
      } catch (error) {
        console.error('Vaccine image processing error:', error);
        setDogUpdateError('ワクチン証明書の処理に失敗しました。別の画像をお試しください。');
      }
    } else {
      setComboVaccineFile(null);
      setDogUpdateError('');
    }
  };

  const handleUpdateDog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog) return;
    
    setIsUpdatingDog(true);
    setDogUpdateError('');
    setDogUpdateSuccess('');
    
    try {
      // Validate gender to match database constraints
      let normalizedGender: string;
      if (dogFormData.gender === 'オス' || dogFormData.gender === 'male' || dogFormData.gender.toLowerCase() === 'male') {
        normalizedGender = 'オス';
      } else if (dogFormData.gender === 'メス' || dogFormData.gender === 'female' || dogFormData.gender.toLowerCase() === 'female') {
        normalizedGender = 'メス';
      } else {
        throw new Error('性別は「オス」または「メス」を選択してください');
      }
      
      // 画像のアップロード処理
      let imageUrl = selectedDog.image_url;
      
      if (dogImageFile) {
        try {
          // 🔥 最終手段：fetch API で直接 Storage API を呼び出し
          const fileName = `${selectedDog.id}/dog-photo.jpg`;
          console.log('📁 File path:', fileName);
          console.log('🚀 Using direct fetch API to bypass SDK...');
          
          // Supabase Storage API の直接呼び出し（正しい認証トークン使用）
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const uploadUrl = `${supabaseUrl}/storage/v1/object/dog-images/${fileName}`;
          
          // 現在のユーザーのアクセストークンを取得
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('認証されていません。ログインしてください。');
          }
          
          console.log('📡 Direct upload URL:', uploadUrl);
          console.log('🔑 Using user access token for authentication');
          
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,  // ユーザーのアクセストークンを使用
              'Content-Type': dogImageFile.type,
              'Cache-Control': '3600'
            },
            body: dogImageFile
          });
          
          console.log('📡 Response status:', response.status);
          console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Direct upload failed:', errorText);
            throw new Error(`直接アップロードに失敗しました: ${response.status} ${errorText}`);
          }
          
          const responseData = await response.json();
          console.log('✅ Direct upload success:', responseData);

          // 公開URLを取得
          const { data: { publicUrl } } = supabase.storage
            .from('dog-images')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
          console.log('✅ Dog profile image uploaded successfully:', imageUrl);
        } catch (imageError) {
          console.error('Image processing error:', imageError);
          setDogUpdateError(`画像のアップロードに失敗しました: ${imageError instanceof Error ? imageError.message : '不明なエラー'}`);
          return; // 画像エラーの場合は処理を停止
        }
      }
      
      // 犬の情報を更新
      console.log('📝 Updating dog in database:', {
        dogId: selectedDog.id,
        dogName: dogFormData.name,
        newImageUrl: imageUrl,
        previousImageUrl: selectedDog.image_url
      });
      
      const { error } = await supabase
        .from('dogs')
        .update({
          name: dogFormData.name,
          breed: dogFormData.breed,
          gender: normalizedGender,
          birth_date: dogFormData.birthDate,
          image_url: imageUrl,
        })
        .eq('id', selectedDog.id);
      
      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }
      
      console.log('✅ Database update successful');
      
      // データベース更新後の確認
      const { data: updatedDog, error: fetchError } = await supabase
        .from('dogs')
        .select('id, name, image_url')
        .eq('id', selectedDog.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching updated dog:', fetchError);
      } else {
        console.log('🔄 Updated dog data from database:', updatedDog);
      }

      // ワクチン証明書のアップロード処理（元のBoltパターンを使用）
      if (rabiesVaccineFile || comboVaccineFile) {
        console.log('🔧 Uploading vaccine certificates using fixed method...');
        
        const uploadResult = await handleVaccineUploadFixed(
          selectedDog.id,
          rabiesVaccineFile || undefined,
          comboVaccineFile || undefined,
          rabiesExpiryDate || undefined,
          comboExpiryDate || undefined
        );

        if (!uploadResult.success) {
          console.error('Fixed vaccine upload failed:', uploadResult.error);
          // ワクチン証明書のエラーは警告として扱い、犬の更新は続行
          setDogUpdateError(`ワクチン証明書のアップロードに失敗しましたが、ワンちゃんの情報は更新されました。エラー: ${uploadResult.error}`);
        } else {
          console.log('✅ Fixed vaccine certificates uploaded successfully');
        }
      }
      
      // Success! Refresh the data
      await fetchDashboardData();
      setDogUpdateSuccess('ワンちゃんの情報を更新しました！');
      setShowDogEditModal(false);
      
      // Clean up form state
      setDogImageFile(null);
      setDogImagePreview(null);
      setRabiesVaccineFile(null);
      setComboVaccineFile(null);
      setRabiesExpiryDate('');
      setComboExpiryDate('');
      setSelectedDog(null);
      
    } catch (error) {
      console.error('Error updating dog:', error);
      setDogUpdateError(error instanceof Error ? error.message : 'ワンちゃんの情報更新に失敗しました。');
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const handleDeleteDog = async (dog: Dog) => {
    setIsDeleting(true);
    setDogUpdateError('');
    
    try {
      console.log('🗑️ Deleting dog from UserDashboard:', dog.name, 'ID:', dog.id);
      
      // 1. ワクチン証明書を削除
      const { error: certError } = await supabase
        .from('vaccine_certifications')
        .delete()
        .eq('dog_id', dog.id);
      
      if (certError) {
        console.error('Error deleting vaccine certifications:', certError);
        // ワクチン証明書の削除エラーは警告として扱い、犬の削除は続行
      }
      
      // 2. 犬の画像を削除（dog-imagesバケットから）
      if (dog.image_url) {
        try {
          // URLからファイルパスを抽出
          const url = new URL(dog.image_url);
          const pathParts = url.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];
          const filePath = `${dog.id}/${fileName}`;
          
          const { error: imageError } = await supabase.storage
            .from('dog-images')
            .remove([filePath]);
          
          if (imageError) {
            console.warn('Warning: Could not delete dog image:', imageError);
            // 画像削除エラーは警告として扱い、犬の削除は続行
          }
        } catch (imageErr) {
          console.warn('Warning: Error processing dog image deletion:', imageErr);
        }
      }
      
      // 3. ワクチン証明書画像を削除（vaccine-certsバケットから）
      const cert = dog.vaccine_certifications?.[0];
      if (cert) {
        const imagesToDelete = [];
        if (cert.rabies_vaccine_image) imagesToDelete.push(cert.rabies_vaccine_image);
        if (cert.combo_vaccine_image) imagesToDelete.push(cert.combo_vaccine_image);
        
        if (imagesToDelete.length > 0) {
          const { error: vaccineImageError } = await supabase.storage
            .from('vaccine-certs')
            .remove(imagesToDelete);
          
          if (vaccineImageError) {
            console.warn('Warning: Could not delete vaccine images:', vaccineImageError);
            // ワクチン画像削除エラーは警告として扱い、犬の削除は続行
          }
        }
      }
      
      // 4. 犬の情報を削除
      const { error: dogError } = await supabase
        .from('dogs')
        .delete()
        .eq('id', dog.id);
      
      if (dogError) {
        console.error('Error deleting dog:', dogError);
        throw dogError;
      }
      
      console.log('✅ Dog deleted successfully from UserDashboard:', dog.name);
      
      // データを再取得
      await fetchDashboardData();
      
      // モーダルを閉じる
      setShowDogEditModal(false);
      
      // 成功メッセージ
      setDogUpdateSuccess(`${dog.name}の情報を削除しました。`);
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setDogUpdateSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error deleting dog:', error);
      const errorMessage = (error as Error).message || 'ワンちゃんの削除に失敗しました';
      setDogUpdateError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // 通知一覧を更新
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // ProtectedRouteで認証チェックが完了しているため、この部分は不要
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="ml-3 text-gray-600">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 通知一覧（新しい順） */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">お知らせ・通知</h2>
        {notifications.length === 0 ? (
          <p>通知はありません</p>
        ) : (
          <ul>
            {notifications
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(notification => (
                <li key={notification.id} className="mb-2">
                  {notification.message}
                  <span className="text-xs text-gray-500 ml-2">{new Date(notification.created_at).toLocaleString('ja-JP')}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      {/* サブスクリプション成功メッセージ */}
      {showSuccessMessage && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium">サブスクリプションの登録が完了しました！</p>
            <p className="text-sm mt-1">全国のドッグランが使い放題になりました。ペットショップでの10%割引も適用されます。</p>
          </div>
        </div>
      )}



      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            こんにちは、{profile?.name || 'ユーザー'}さん
          </h1>
          <p className="text-gray-600">ドッグパークJPへようこそ</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/access-control">
            <Button className="bg-green-600 hover:bg-green-700">
              <Key className="w-4 h-4 mr-2" />
              入退場
            </Button>
          </Link>
        </div>
      </div>

      {/* サブスクリプション状況 */}
      {hasSubscription ? (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-semibold">サブスクリプション会員</h3>
                <p className="text-sm opacity-90">全国のドッグラン使い放題 + ペットショップ10%OFF</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">月額</p>
              <p className="text-2xl font-bold">¥3,800</p>
              <Link to="/subscription">
                <Button size="sm" className="mt-2 bg-white text-purple-600 hover:bg-gray-100 hover:text-gray-900">
                  詳細を見る
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-semibold">サブスクリプションでもっとお得に！</h3>
                <p className="text-sm opacity-90">月額3,800円で全国のドッグラン使い放題</p>
              </div>
            </div>
            <SubscriptionButton hasSubscription={hasSubscription} className="bg-white text-purple-600 hover:bg-gray-100" />
          </div>
        </Card>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<PawPrint className="w-8 h-8 text-blue-600" />}
          count={dogs.length}
          label="登録済みワンちゃん"
          linkTo="/dog-management"
          linkText="管理する"
          iconColor="text-blue-600"
        />
        
        <StatCard 
          icon={<Calendar className="w-8 h-8 text-green-600" />}
          count={recentReservations.length}
          label="今月の予約"
          linkTo="/parks"
          linkText="予約する"
          iconColor="text-green-600"
        />
        
        <StatCard 
          icon={<Bell className="w-8 h-8 text-orange-600" />}
          count={notifications.length}
          label="未読通知"
          linkTo="/community"
          linkText="確認する"
          iconColor="text-orange-600"
        />
        
        <StatCard 
          icon={<Building className="w-8 h-8 text-purple-600" />}
          count={ownedParks.length > 0 ? ownedParks.length : "登録する"}
          label={ownedParks.length > 0 ? "運営中ドッグラン" : "ドッグラン登録"}
          linkTo={ownedParks.length > 0 ? "/owner-dashboard" : "/park-registration-agreement"}
          linkText={ownedParks.length > 0 ? "管理する" : "登録する"}
          iconColor="text-purple-600"
        />
      </div>

      {/* 新着情報 */}
      {news.length > 0 && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Bell className="w-6 h-6 text-blue-600 mr-2" />
              新着情報
            </h2>
            <Link to="/news">
              <Button size="sm" variant="secondary">
                すべて見る
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.category === 'announcement' 
                          ? 'bg-red-100 text-red-800' 
                          : item.category === 'sale'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.category === 'announcement' 
                          ? '重要なお知らせ' 
                          : item.category === 'sale'
                          ? 'セール情報'
                          : 'お知らせ'
                        }
                      </span>
                      {item.is_important && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          重要
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  {item.link_url && (
                    <a 
                      href={item.link_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-4"
                    >
                      <Button size="sm" variant="secondary">
                        詳細
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-8">
          {/* ワンちゃん管理 */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <PawPrint className="w-6 h-6 text-blue-600 mr-2" />
                ワンちゃん管理
              </h2>
              <Link to="/register-dog">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新規登録
                </Button>
              </Link>
            </div>
            
            {dogs.length === 0 ? (
              <div className="text-center py-8">
                <PawPrint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">まだワンちゃんが登録されていません</p>
                <Link to="/register-dog">
                  <Button>ワンちゃんを登録する</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {dogs.map((dog) => (
                  <DogCard 
                    key={dog.id} 
                    dog={dog} 
                    onEdit={handleDogSelect} 
                  />
                ))}
              </div>
            )}
          </Card>

          {/* ドッグラン管理 */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Building className="w-6 h-6 text-purple-600 mr-2" />
                ドッグラン管理
              </h2>
              <Link to="/park-registration-agreement">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新規登録
                </Button>
              </Link>
            </div>
            
            {ownedParks.length === 0 ? (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">まだドッグランが登録されていません</p>
                <Link to="/park-registration-agreement">
                  <Button>ドッグランを登録する</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {ownedParks.map((park) => (
                  <ParkCard 
                    key={park.id} 
                    park={park} 
                    onSelect={handleParkSelect} 
                  />
                ))}
              </div>
            )}
          </Card>

          {/* 最近の予約 */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Calendar className="w-6 h-6 text-green-600 mr-2" />
                最近の予約
              </h2>
              <Link to="/parks">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新規予約
                </Button>
              </Link>
            </div>
            
            {recentReservations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">まだ予約がありません</p>
                <Link to="/parks">
                  <Button>ドッグランを予約する</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReservations.map((reservation) => (
                  <ReservationCard 
                    key={reservation.id} 
                    reservation={reservation} 
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-8">
          {/* 最近仲間入りしたワンちゃん */}
          <Card>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <PawPrint className="w-5 h-5 text-blue-600 mr-2" />
              最近仲間入りしたワンちゃん
            </h2>
            
            {recentDogsError ? (
              <div className="text-center py-4">
                <p className="text-red-600 text-sm">{recentDogsError}</p>
              </div>
            ) : recentDogs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">まだワンちゃんが登録されていません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDogs.map((dog) => (
                  <div key={dog.id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {dog.image_url ? (
                        <img 
                          src={dog.image_url} 
                          alt={dog.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PawPrint className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{dog.name}</h3>
                      <p className="text-xs text-gray-500">{dog.breed}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* クイックアクション */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
            <div className="space-y-3">
              <Link to="/parks" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <MapPin className="w-4 h-4 mr-2" />
                  ドッグランを探す
                </Button>
              </Link>
              <Link to="/pet-shop" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  ペットショップ
                </Button>
              </Link>
              <Link to="/community" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  コミュニティ
                </Button>
              </Link>
              <Link to="/order-history" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <History className="w-4 h-4 mr-2" />
                  注文履歴
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* 犬の編集モーダル */}
      {showDogEditModal && (
        <DogEditModal
          dog={selectedDog}
          isUpdating={isUpdatingDog || isDeleting}
          error={dogUpdateError}
          success={dogUpdateSuccess}
          dogFormData={dogFormData}
          dogImagePreview={dogImagePreview}
          onClose={() => setShowDogEditModal(false)}
          onSubmit={handleUpdateDog}
          onDelete={handleDeleteDog}
          onFormChange={setDogFormData}
          onImageSelect={handleDogImageSelect}
          onImageRemove={handleDogImageRemove}
          // ワクチン証明書関連の props
          rabiesVaccineFile={rabiesVaccineFile}
          comboVaccineFile={comboVaccineFile}
          rabiesExpiryDate={rabiesExpiryDate}
          comboExpiryDate={comboExpiryDate}
          onRabiesVaccineSelect={handleRabiesVaccineSelect}
          onComboVaccineSelect={handleComboVaccineSelect}
          onRabiesExpiryDateChange={setRabiesExpiryDate}
          onComboExpiryDateChange={setComboExpiryDate}
        />
      )}

      {/* ドッグラン詳細モーダル */}
      {showParkModal && selectedPark && (
        <ParkModal
          park={selectedPark}
          onClose={() => setShowParkModal(false)}
        />
      )}
    </div>
  );
}