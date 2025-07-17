import {
  AlertTriangle,
  Building,
  Calendar,
  Check,
  DollarSign,
  Eye,
  FileText,
  MapPin,
  Search,
  SortAsc,
  SortDesc,
  Star,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import useAuth from '../context/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import { supabase } from '../utils/supabase';

// Park data interface
interface ParkData {
  id: string;
  name: string;
  description: string;
  address: string;
  price: number;
  status: 'pending' | 'first_stage_passed' | 'second_stage_waiting' | 'second_stage_review' | 'smart_lock_testing' | 'approved' | 'rejected';
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  owner_address?: string;
  created_at: string;
  max_capacity: number;
  large_dog_area: boolean;
  small_dog_area: boolean;
  private_booths: boolean;
  facilities: {
    parking: boolean;
    shower: boolean;
    restroom: boolean;
    agility: boolean;
    rest_area: boolean;
    water_station: boolean;
  };
  average_rating?: number;
  review_count?: number;
  facility_details?: string;
  private_booth_count?: number;
  image_url?: string;
  cover_image_url?: string;
  facility_images?: FacilityImage[];
  // 本人確認書類の情報を追加
  identity_document_url?: string;
  identity_document_filename?: string;
  identity_status?: 'not_submitted' | 'submitted' | 'approved' | 'rejected';
  identity_created_at?: string;
}

interface FacilityImage {
  id: string;
  image_type: string;
  image_url: string;
  is_approved?: boolean;
  admin_notes?: string;
  created_at: string;
}

export function AdminParkManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'parks' | 'applications'>('applications');
  const [parks, setParks] = useState<ParkData[]>([]);
  const [filteredParks, setFilteredParks] = useState<ParkData[]>([]);
  const [approvedParks, setApprovedParks] = useState<ParkData[]>([]);
  const [allApprovedParks, setAllApprovedParks] = useState<ParkData[]>([]); // 全承認済みパークのキャッシュ
  const [pendingParks, setPendingParks] = useState<ParkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'first_stage_passed' | 'second_stage_waiting' | 'second_stage_review' | 'smart_lock_testing' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'average_rating'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 画像拡大表示用のステート
  const [enlargedImage, setEnlargedImage] = useState<{
    url: string;
    type: string;
    parkName: string;
  } | null>(null);

  // ドッグラン申請データ用のカスタムフック
  const adminData = useAdminData('parks');

  // 詳細情報を取得する関数
  const fetchParkDetails = async (parkIds: string[]) => {
    if (parkIds.length === 0) return new Map();

    try {
      const { data, error } = await supabase
        .from('dog_parks')
        .select(`
          id,
          description,
          price,
          max_capacity,
          large_dog_area,
          small_dog_area,
          private_booths,
          facilities,
          facility_details,
          private_booth_count,
          image_url,
          cover_image_url,
          average_rating,
          review_count
        `)
        .in('id', parkIds);

      if (error) {
        console.error('❌ パーク詳細情報取得エラー:', error);
        return new Map();
      }

      // IDをキーとしたマップを作成
      const detailsMap = new Map();
      (data || []).forEach(park => {
        detailsMap.set(park.id, park);
      });

      return detailsMap;
    } catch (error) {
      console.error('❌ パーク詳細情報取得エラー:', error);
      return new Map();
    }
  };

  // 設備画像を取得する関数
  const fetchFacilityImages = async (parkIds: string[]) => {
    if (parkIds.length === 0) return new Map();

    try {
      const { data, error } = await supabase
        .from('dog_park_facility_images')
        .select(`
          id,
          park_id,
          image_type,
          image_url,
          is_approved,
          admin_notes,
          created_at
        `)
        .in('park_id', parkIds);

      if (error) {
        console.error('❌ 設備画像取得エラー:', error);
        return new Map();
      }

      // park_idをキーとしたマップを作成
      const imagesMap = new Map();
      (data || []).forEach(image => {
        if (!imagesMap.has(image.park_id)) {
          imagesMap.set(image.park_id, []);
        }
        imagesMap.get(image.park_id).push(image);
      });

      return imagesMap;
    } catch (error) {
      console.error('❌ 設備画像取得エラー:', error);
      return new Map();
    }
  };

  // 承認済みパークを取得する関数
  const fetchApprovedParks = async () => {
    try {
      const { data: approvedParksData, error } = await supabase
        .from('dog_parks')
        .select(`
          *,
          profiles:owner_id (
            name,
            address,
            phone_number,
            email,
            postal_code
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 承認済みパーク取得エラー:', error);
        return [];
      }

      // 承認済みパークを変換
      const convertedApprovedParks = approvedParksData.map(park => {
        const profile = Array.isArray(park.profiles) ? park.profiles[0] : park.profiles;
        return convertPendingParkToParkData({
          id: park.id,
          name: park.name,
          address: park.address,
          status: park.status,
          created_at: park.created_at,
          owner_id: park.owner_id,
          owner_name: profile?.name || 'Unknown',
          owner_email: profile?.email || 'Unknown',
          owner_phone_number: profile?.phone_number || '',
          owner_address: profile?.address || '',
          identity_document_url: '',
          identity_document_filename: '',
          identity_status: 'approved',
          identity_created_at: ''
        }, park, []);
      });

      return convertedApprovedParks;
    } catch (error) {
      console.error('❌ 承認済みパーク取得エラー:', error);
      return [];
    }
  };

  // 画像クリック時のハンドラー
  const handleImageClick = (imageUrl: string, imageType: string, parkName: string) => {
    setEnlargedImage({
      url: imageUrl,
      type: imageType,
      parkName: parkName
    });
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setEnlargedImage(null);
  };

  // ESCキーでモーダルを閉じる
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCloseModal();
    }
  };

  // メッセージ管理
  const showSuccess = (message: string) => {
    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 5000);
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess('');
    setTimeout(() => setError(''), 8000);
  };

  // 削除機能の追加
  const handleDelete = async (parkId: string) => {
    const confirmDelete = window.confirm('このドッグラン申請を削除してもよろしいですか？この操作は取り消せません。');
    if (!confirmDelete) return;

    try {
      setError('');
      setSuccess('');

      // ドッグランデータを削除
      const { error: deleteError } = await supabase
        .from('dog_parks')
        .delete()
        .eq('id', parkId);

      if (deleteError) {
        console.error('❌ ドッグラン削除エラー:', deleteError);
        showError('ドッグランの削除に失敗しました。');
        return;
      }

      // 成功時の処理
      showSuccess('ドッグラン申請を削除しました。');

      // 削除後にリストを更新
      setParks(prevParks => prevParks.filter(park => park.id !== parkId));

    } catch (error) {
      console.error('❌ ドッグラン削除エラー:', error);
      showError('ドッグランの削除に失敗しました。');
    }
  };

  // PendingPark型をParkData型に変換する関数
  const convertPendingParkToParkData = (pendingPark: any, parkDetails?: any, facilityImages?: any[]): ParkData => {
    const details = parkDetails || {};

    // デバッグログ: 申請者情報の確認
    console.log('🔍 申請者情報のデバッグ:', {
      parkName: pendingPark.name,
      owner_name: pendingPark.owner_name,
      owner_address: pendingPark.owner_address,
      owner_email: pendingPark.owner_email,
      owner_phone_number: pendingPark.owner_phone_number,
      identity_document_url: pendingPark.identity_document_url,
      identity_status: pendingPark.identity_status,
      rawPendingPark: pendingPark
    });

    return {
      id: pendingPark.id,
      name: pendingPark.name,
      description: details.description || '',
      address: pendingPark.address,
      price: details.price || 0,
      status: pendingPark.status,
      owner_id: pendingPark.owner_id,
      created_at: pendingPark.created_at,
      max_capacity: details.max_capacity || 0,
      large_dog_area: details.large_dog_area || false,
      small_dog_area: details.small_dog_area || false,
      private_booths: details.private_booths || false,
      facilities: details.facilities || {
        parking: false,
        shower: false,
        restroom: false,
        agility: false,
        rest_area: false,
        water_station: false
      },
      average_rating: details.average_rating || 0,
      review_count: details.review_count || 0,
      facility_details: details.facility_details || '',
      private_booth_count: details.private_booth_count || 0,
      image_url: details.image_url || '',
      cover_image_url: details.cover_image_url || '',
      owner_name: pendingPark.owner_name || 'Unknown',
      owner_email: pendingPark.owner_email || 'Unknown',
      owner_phone: pendingPark.owner_phone_number || '',
      owner_address: pendingPark.owner_address || '',
      facility_images: facilityImages || [],
      // 本人確認書類の情報を追加
      identity_document_url: pendingPark.identity_document_url || '',
      identity_document_filename: pendingPark.identity_document_filename || '',
      identity_status: pendingPark.identity_status || 'not_submitted',
      identity_created_at: pendingPark.identity_created_at || ''
    };
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin-dashboard');
      return;
    }

    console.log('✅ 管理者権限を確認しました。データ取得を開始します。');
    // fetchParks(); // 独自のfetchParksを削除し、useAdminDataフックのデータを使用
  }, [isAdmin, navigate]);

  // 詳細情報を取得してデータを統合する
  useEffect(() => {
    if (!adminData.isLoading && adminData.pendingParks.length > 0) {
      const fetchAndMergeDetails = async () => {
        console.log('🔄 詳細情報を取得中...');

        // パークIDを抽出
        const parkIds = adminData.pendingParks.map(park => park.id);

        // 詳細情報と設備画像を並行して取得
        const [parkDetailsMap, facilityImagesMap] = await Promise.all([
          fetchParkDetails(parkIds),
          fetchFacilityImages(parkIds)
        ]);

        // PendingPark型をParkData型に変換（詳細情報を統合）
        const convertedParks = adminData.pendingParks.map(pendingPark => {
          const parkDetails = parkDetailsMap.get(pendingPark.id);
          const facilityImages = facilityImagesMap.get(pendingPark.id) || [];

          return convertPendingParkToParkData(pendingPark, parkDetails, facilityImages);
        });

        console.log('✅ 詳細情報を統合しました:', convertedParks.length, 'パーク');
        setParks(convertedParks);
        setIsLoading(false);
        separateParks();

        // 承認済みパークも取得（一度のみ）
        fetchApprovedParks().then(approved => {
          setAllApprovedParks(approved);
          filterApprovedParks(approved);
        });
      };

      fetchAndMergeDetails();
    } else if (!adminData.isLoading) {
      console.log('🔍 審査中のパークが見つかりませんでした');
      setParks([]);
      setIsLoading(false);
      separateParks();

      // 承認済みパークも取得
      fetchApprovedParks().then(approved => {
        setAllApprovedParks(approved);
        filterApprovedParks(approved);
      });
    } else {
      setIsLoading(true);
    }
  }, [adminData.pendingParks, adminData.isLoading]);

  // 承認済みパークのフィルタリング機能
  const filterApprovedParks = (approved: ParkData[]) => {
    // 基本フィルタリング
    let filteredApproved = approved.filter(park => {
      const matchesSearch = !searchTerm ||
        park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || filterStatus === 'approved';

      return matchesSearch && matchesStatus;
    });

    // ソート機能
    filteredApproved = filteredApproved.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'average_rating':
          aValue = a.average_rating || 0;
          bValue = b.average_rating || 0;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setApprovedParks(filteredApproved);
  };

  // 承認済みパークの検索・フィルタリング更新
  useEffect(() => {
    if (allApprovedParks.length > 0) {
      filterApprovedParks(allApprovedParks);
    }
  }, [searchTerm, filterStatus, sortBy, sortOrder, allApprovedParks]);

  // 申請中パークのフィルタリング更新
  useEffect(() => {
    if (parks.length > 0) {
      separateParks();
    }
  }, [searchTerm, filterStatus, sortBy, sortOrder, parks]);

  const separateParks = () => {
    // ドッグラン申請タブに表示するステータス（審査プロセス中）
    const applicationStatuses = ['pending', 'first_stage_passed', 'second_stage_waiting', 'second_stage_review', 'smart_lock_testing'];

    // ドッグラン一覧タブに表示するステータス（公開可能）
    const approvedStatuses = ['approved'];

    // 基本フィルタリング
    let filteredData = parks.filter(park => {
      const matchesSearch = !searchTerm ||
        park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || park.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // ソート機能
    filteredData = filteredData.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'average_rating':
          aValue = a.average_rating || 0;
          bValue = b.average_rating || 0;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredParks(filteredData);

    // 審査中と承認済みに分離（フィルタリング後のデータを使用）
    const pending = filteredData.filter(park => applicationStatuses.includes(park.status));
    const approved = filteredData.filter(park => approvedStatuses.includes(park.status));

    setPendingParks(pending);
    // 注意：ここでsetApprovedParksは使わない（承認済みは別途fetchApprovedParksで取得）

    console.log('🔄 パーク分離完了:', {
      total: filteredData.length,
      pending: pending.length,
      approved: approved.length,
      filter: filterStatus,
      search: searchTerm
    });
  };

  // 承認機能
  const handleApprove = async (parkId: string) => {
    const park = parks.find(p => p.id === parkId);
    if (!park) return;

    // 一時的な回避策：pendingから直接approvedに更新
    const isTemporaryFix = window.confirm(
      '⚠️ 一時的な回避策を使用しますか？\n\n' +
      '「はい」を選択すると、第一審査から直接「承認済み」に変更されます。\n' +
      '「いいえ」を選択すると、通常の承認処理を実行します（データベース制約の修正が必要）。'
    );

    let nextStatus: string;
    let confirmMessage: string;
    let successMessage: string;
    let notificationTitle: string;
    let notificationMessage: string;

    if (isTemporaryFix) {
      // 一時的な回避策：second_stage_waitingにして申請タブに残す
      nextStatus = 'second_stage_waiting';
      confirmMessage = '⚠️ 一時的な回避策として、このドッグランを「第二審査提出待ち」にしてもよろしいですか？\n\n※ 申請タブに残り、後で再度承認処理ができます。';
      successMessage = '⚠️ 一時的な回避策により、ドッグランのステータスが「第二審査提出待ち」に変更されました。';
      notificationTitle = 'ドッグラン第一審査承認';
      notificationMessage = `${park.name}の第一審査が承認されました。`;
    } else {
      // 通常の承認処理
      switch (park.status) {
        case 'pending':
          nextStatus = 'second_stage_waiting';
          confirmMessage = 'このドッグランの第一審査を承認してもよろしいですか？';
          successMessage = 'ドッグランの第一審査を承認しました。';
          notificationTitle = 'ドッグラン第一審査承認';
          notificationMessage = `${park.name}の第一審査が承認されました。`;
          break;
        case 'second_stage_waiting':
          nextStatus = 'second_stage_review';
          confirmMessage = 'このドッグランを第二審査中に変更しますか？';
          successMessage = 'ドッグランが第二審査中に変更されました。';
          notificationTitle = 'ドッグラン第二審査開始';
          notificationMessage = `${park.name}の第二審査が開始されました。`;
          break;
        case 'second_stage_review':
          nextStatus = 'smart_lock_testing';
          confirmMessage = 'このドッグランの第二審査を承認してもよろしいですか？';
          successMessage = 'ドッグランの第二審査を承認しました。';
          notificationTitle = 'ドッグラン第二審査承認';
          notificationMessage = `${park.name}の第二審査が承認されました。`;
          break;
        case 'smart_lock_testing':
          nextStatus = 'approved';
          confirmMessage = 'このドッグランの承認を完了してもよろしいですか？';
          successMessage = 'ドッグランが承認されました。';
          notificationTitle = 'ドッグラン承認完了';
          notificationMessage = `${park.name}が承認されました。`;
          break;
        default:
          showError('このドッグランの現在のステータスでは承認できません。');
          return;
      }
    }

    const confirmApprove = window.confirm(confirmMessage);
    if (!confirmApprove) return;

    try {
      setError('');
      setSuccess('');

      console.log('🔄 承認処理開始:', { parkId, currentStatus: park.status, nextStatus });

      // ステータス更新を実行
      const { error: updateError } = await supabase
        .from('dog_parks')
        .update({ status: nextStatus })
        .eq('id', parkId);

      if (updateError) {
        console.error('❌ 承認エラー詳細:', updateError);

        if (updateError.code === '23514') {
          showError(`承認処理に失敗しました: ステータス "${nextStatus}" が許可されていません。

📋 データベースの制約を更新してください：

1. https://app.supabase.com にアクセス
2. プロジェクトを選択
3. 左側メニューから「SQL Editor」を選択
4. 以下のSQLを実行：

ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;
ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check CHECK (status IN ('pending', 'first_stage_passed', 'second_stage_waiting', 'second_stage_review', 'smart_lock_testing', 'approved', 'rejected'));

5. ページを再読み込み`);
        } else {
          showError(`承認処理に失敗しました: ${updateError.message || '不明なエラー'}`);
        }
        return;
      }

      console.log('✅ ステータス更新成功:', { parkId, nextStatus });

      // 通知を送信（一時的に無効化）
      console.log('🔄 通知送信をスキップ（一時的に無効化）');
      /*
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: park.owner_id,
              title: notificationTitle,
              message: notificationMessage,
              type: 'park_approved',
              created_at: new Date().toISOString(),
              read: false
            }
          ]);

        if (notificationError) {
          console.error('❌ 通知送信エラー:', notificationError);
        } else {
          console.log('✅ 通知送信成功');
        }
      } catch (notificationError) {
        console.error('❌ 通知送信エラー:', notificationError);
      }
      */

      showSuccess(successMessage);

      // 承認後にリストを更新
      const updatedParks = parks.map(p =>
        p.id === parkId
          ? { ...p, status: nextStatus as any }
          : p
      );

      setParks(updatedParks);

      // リストを再フィルタリング
      setTimeout(() => {
        // 状態が更新された後にフィルタリングを実行
        const applicationStatuses = ['pending', 'first_stage_passed', 'second_stage_waiting', 'second_stage_review', 'smart_lock_testing'];
        const filteredData = updatedParks.filter(park => {
          const matchesSearch = !searchTerm ||
            park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            park.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            park.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesStatus = filterStatus === 'all' || park.status === filterStatus;

          return matchesSearch && matchesStatus;
        });

        const pending = filteredData.filter(park => applicationStatuses.includes(park.status));
        setPendingParks(pending);

        console.log('🔄 リスト更新完了:', {
          totalParks: updatedParks.length,
          pendingParks: pending.length,
          updatedStatus: nextStatus
        });
      }, 100);

      console.log('✅ 承認処理完了');

    } catch (error) {
      console.error('❌ 承認処理エラー:', error);
      showError(`承認処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // 却下機能
  const handleReject = async (parkId: string) => {
    const confirmReject = window.confirm('このドッグラン申請を却下してもよろしいですか？');
    if (!confirmReject) return;

    try {
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('dog_parks')
        .update({ status: 'rejected' })
        .eq('id', parkId);

      if (updateError) {
        console.error('❌ 却下エラー:', updateError);
        showError('却下の処理に失敗しました。');
        return;
      }

      // 却下された公園の情報を取得
      const park = parks.find(p => p.id === parkId);
      if (park) {
        // 通知を送信
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: park.owner_id,
              title: 'ドッグラン申請却下',
              message: `${park.name}の申請が却下されました。詳細については管理者までお問い合わせください。`,
              type: 'park_rejected',
              created_at: new Date().toISOString(),
              read: false
            }
          ]);
      }

      showSuccess('ドッグラン申請を却下しました。');

      // 却下後にリストを更新
      setParks(prevParks =>
        prevParks.map(park =>
          park.id === parkId
            ? { ...park, status: 'rejected' as const }
            : park
        )
      );

    } catch (error) {
      console.error('❌ 却下エラー:', error);
      showError('却下の処理に失敗しました。');
    }
  };

  // ステータスの色分け
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'first_stage_passed': return 'bg-blue-100 text-blue-800';
      case 'second_stage_waiting': return 'bg-orange-100 text-orange-800';
      case 'second_stage_review': return 'bg-purple-100 text-purple-800';
      case 'smart_lock_testing': return 'bg-indigo-100 text-indigo-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ステータスのラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '第一審査中';
      case 'first_stage_passed': return '第一審査通過（旧）';
      case 'second_stage_waiting': return '第二審査提出待ち';
      case 'second_stage_review': return '第二審査中';
      case 'smart_lock_testing': return 'スマートロック認証待ち';
      case 'approved': return '承認済み・公開可能';
      case 'rejected': return '却下';
      default: return '不明';
    }
  };

  // 価格フォーマット
  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">ドッグラン管理</h1>
            <p className="text-gray-600">ドッグラン施設の詳細情報と申請管理</p>
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="px-6 py-4 bg-green-50 border-l-4 border-green-400">
              <div className="flex">
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('applications')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                ドッグラン申請
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {pendingParks.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('parks')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'parks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Building className="w-5 h-5 inline mr-2" />
                ドッグラン一覧
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {approvedParks.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ */}
        {activeTab === 'parks' && (
          <div className="space-y-6">

            {/* 検索・フィルター */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    label=""
                    placeholder="施設名、住所、オーナー名で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  label=""
                  options={[
                    { value: 'all', label: '全ステータス' },
                    { value: 'approved', label: '承認済み' }
                  ]}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                />

                <Select
                  label=""
                  options={[
                    { value: 'created_at', label: '作成日時' },
                    { value: 'name', label: '施設名' },
                    { value: 'average_rating', label: '平均評価' }
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                />

                <Button
                  variant="secondary"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center justify-center"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                  {sortOrder === 'asc' ? '昇順' : '降順'}
                </Button>
              </div>
            </Card>

            {/* 承認済みドッグラン一覧 */}
            {approvedParks.length === 0 ? (
              <Card className="text-center py-12">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm || filterStatus !== 'all'
                    ? '条件に一致するドッグランが見つかりません'
                    : '承認済みのドッグランがありません'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {approvedParks.map((park) => (
                  <Card key={park.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{park.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(park.status)}`}>
                            {getStatusLabel(park.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <MapPin className="w-4 h-4 mr-1" />
                              {park.address}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {formatPrice(park.price)}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(park.created_at)}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <User className="w-4 h-4 mr-1" />
                              {park.owner_name}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <Users className="w-4 h-4 mr-1" />
                              定員: {park.max_capacity}頭
                            </div>
                            {park.average_rating && park.average_rating > 0 && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Star className="w-4 h-4 mr-1" />
                                {park.average_rating.toFixed(1)} ({park.review_count || 0}件)
                              </div>
                            )}
                          </div>
                        </div>

                        {park.description && (
                          <p className="text-sm text-gray-600 mb-3">{park.description}</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {park.large_dog_area && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">大型犬エリア</span>
                          )}
                          {park.small_dog_area && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">小型犬エリア</span>
                          )}
                          {park.private_booths && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">個室あり</span>
                          )}
                          {park.facilities.parking && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">駐車場</span>
                          )}
                          {park.facilities.shower && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">シャワー</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/parks/${park.id}`}
                          className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          詳細
                        </Link>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDelete(park.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-6">

            {/* 検索・フィルター */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    label=""
                    placeholder="施設名、住所、オーナー名で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  label=""
                  options={[
                    { value: 'all', label: '全ステータス' },
                    { value: 'pending', label: '第一審査中' },
                    { value: 'first_stage_passed', label: '第一審査通過（旧）' },
                    { value: 'second_stage_waiting', label: '第二審査提出待ち' },
                    { value: 'second_stage_review', label: '第二審査中' },
                    { value: 'smart_lock_testing', label: 'スマートロック認証待ち' },
                    { value: 'rejected', label: '却下' }
                  ]}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                />

                <Select
                  label=""
                  options={[
                    { value: 'created_at', label: '作成日時' },
                    { value: 'name', label: '施設名' },
                    { value: 'average_rating', label: '平均評価' }
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                />

                <Button
                  variant="secondary"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center justify-center"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                  {sortOrder === 'asc' ? '昇順' : '降順'}
                </Button>
              </div>
            </Card>

            {/* 審査中申請一覧 */}
            {pendingParks.length === 0 ? (
              <Card className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm || filterStatus !== 'all'
                    ? '条件に一致する申請が見つかりません'
                    : '審査中の申請がありません'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {pendingParks.map((park) => (
                  <Card key={park.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{park.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(park.status)}`}>
                            {getStatusLabel(park.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">申請者情報</h4>
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <User className="w-4 h-4 mr-2" />
                                {park.owner_name}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                {park.owner_address || '住所未登録'}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                申請日: {formatDate(park.created_at)}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">施設情報</h4>
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                {park.address}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <DollarSign className="w-4 h-4 mr-2" />
                                {formatPrice(park.price)}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Users className="w-4 h-4 mr-2" />
                                定員: {park.max_capacity}頭
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 本人確認書類セクション */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            本人確認書類
                          </h4>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            {park.identity_document_url && park.identity_document_url !== '' ? (
                              <div className="flex items-start space-x-4">
                                <div className="relative">
                                  <img
                                    src={`${supabase.storage.from('vaccine-certs').getPublicUrl(park.identity_document_url || '').data.publicUrl}`}
                                    alt="本人確認書類"
                                    className="w-32 h-32 object-cover rounded border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => handleImageClick(
                                      `${supabase.storage.from('vaccine-certs').getPublicUrl(park.identity_document_url || '').data.publicUrl}`,
                                      '本人確認書類',
                                      park.name
                                    )}
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="mb-2">
                                    <span className="text-sm font-medium text-gray-700">ファイル名:</span>
                                    <span className="text-sm text-gray-600 ml-2">{park.identity_document_filename || 'identity_document'}</span>
                                  </div>
                                  <div className="mb-2">
                                    <span className="text-sm font-medium text-gray-700">審査状況:</span>
                                    <span className={`text-sm ml-2 px-2 py-1 rounded-full ${park.identity_status === 'approved' ? 'bg-green-100 text-green-800' :
                                      park.identity_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        park.identity_status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-gray-100 text-gray-800'
                                      }`}>
                                      {park.identity_status === 'approved' ? '承認済み' :
                                        park.identity_status === 'rejected' ? '却下' :
                                          park.identity_status === 'submitted' ? '審査中' :
                                            '未提出'}
                                    </span>
                                  </div>
                                  {park.identity_created_at && (
                                    <div className="mb-2">
                                      <span className="text-sm font-medium text-gray-700">提出日:</span>
                                      <span className="text-sm text-gray-600 ml-2">{formatDate(park.identity_created_at)}</span>
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-2">
                                    クリックして拡大表示
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">本人確認書類が提出されていません</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {park.description && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">施設説明</h4>
                            <p className="text-sm text-gray-600">{park.description}</p>
                          </div>
                        )}

                        {/* 設備情報 */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">設備・サービス</h4>
                          <div className="flex flex-wrap gap-2">
                            {park.large_dog_area && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">大型犬エリア</span>
                            )}
                            {park.small_dog_area && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">小型犬エリア</span>
                            )}
                            {park.private_booths && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">個室あり</span>
                            )}
                            {park.facilities.parking && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">駐車場</span>
                            )}
                            {park.facilities.shower && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">シャワー</span>
                            )}
                            {park.facilities.restroom && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">トイレ</span>
                            )}
                            {park.facilities.agility && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">アジリティ</span>
                            )}
                            {park.facilities.rest_area && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">休憩エリア</span>
                            )}
                            {park.facilities.water_station && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">給水設備</span>
                            )}
                          </div>
                        </div>

                        {/* 二次審査の場合は設備画像を表示 */}
                        {park.status === 'second_stage_review' && park.facility_images && park.facility_images.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">設備画像 ({park.facility_images.length}枚)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {park.facility_images.map((image, index) => (
                                <div key={image.id} className="relative">
                                  <img
                                    src={image.image_url}
                                    alt={`設備画像 ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleImageClick(image.image_url, image.image_type, park.name)}
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-b-md">
                                    {image.image_type}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      {(park.status === 'pending' || park.status === 'first_stage_passed' || park.status === 'second_stage_review') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(park.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {park.status === 'pending' ? '第一審査承認' :
                              park.status === 'second_stage_review' ? '第二審査承認' :
                                '承認'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleReject(park.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            却下
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDelete(park.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 画像拡大モーダル */}
      {enlargedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={enlargedImage.url}
              alt={`${enlargedImage.parkName} - ${enlargedImage.type}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
              <h3 className="font-medium text-lg">{enlargedImage.parkName}</h3>
              <p className="text-sm text-gray-300">{enlargedImage.type}</p>
            </div>
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 