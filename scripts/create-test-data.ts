// テストデータ作成スクリプト
// npm run create-test-data で実行

import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの設定
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestUser {
  id?: string;
  email: string;
  fullName: string;
  dog: {
    name: string;
    breed: string;
    gender: 'オス' | 'メス';
    birthDate: string;
    weight: number;
    color: string;
    personality: string;
  };
}

const testUsers: TestUser[] = [
  {
    email: 'tanaka@example.com',
    fullName: '田中太郎',
    dog: {
      name: 'ポチ',
      breed: '柴犬',
      gender: 'オス',
      birthDate: '2022-03-15',
      weight: 8.5,
      color: '茶色',
      personality: '元気で人懐っこい'
    }
  },
  {
    email: 'sato@example.com',
    fullName: '佐藤花子',
    dog: {
      name: 'ココ',
      breed: 'トイプードル',
      gender: 'メス',
      birthDate: '2023-01-20',
      weight: 3.2,
      color: '白',
      personality: '甘えん坊で賢い'
    }
  },
  {
    email: 'yamada@example.com',
    fullName: '山田次郎',
    dog: {
      name: 'チョコ',
      breed: 'ゴールデンレトリバー',
      gender: 'オス',
      birthDate: '2021-08-10',
      weight: 28.5,
      color: 'ゴールド',
      personality: '優しくて大人しい'
    }
  }
];

async function createTestData() {
  console.log('🚀 テストデータの作成を開始します...');

  try {
    // 1. 既存のユーザーを確認
    const { data: existingUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .order('created_at', { ascending: true })
      .limit(3);

    if (usersError) {
      throw new Error(`ユーザー取得エラー: ${usersError.message}`);
    }

    console.log('📋 既存のユーザー:', existingUsers);

    // 2. 既存のユーザーのプロファイルを更新
    const updatedUsers: TestUser[] = [];
    
    for (let i = 0; i < Math.min(existingUsers.length, testUsers.length); i++) {
      const existingUser = existingUsers[i];
      const testUser = testUsers[i];
      testUser.id = existingUser.id;

      // プロファイルを更新
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: testUser.fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (profileError) {
        console.error(`❌ プロファイル更新エラー (${testUser.fullName}):`, profileError);
        continue;
      }

      console.log(`✅ プロファイル更新完了: ${testUser.fullName}`);

      // 犬のデータを追加/更新
      const { error: dogError } = await supabase
        .from('dogs')
        .upsert({
          user_id: existingUser.id,
          name: testUser.dog.name,
          breed: testUser.dog.breed,
          gender: testUser.dog.gender,
          birth_date: testUser.dog.birthDate,
          weight: testUser.dog.weight,
          color: testUser.dog.color,
          personality: testUser.dog.personality,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (dogError) {
        console.error(`❌ 犬データ追加エラー (${testUser.dog.name}):`, dogError);
        continue;
      }

      console.log(`🐕 犬データ追加完了: ${testUser.dog.name} (${testUser.dog.breed})`);
      updatedUsers.push(testUser);
    }

    if (updatedUsers.length < 2) {
      console.log('⚠️ 友達リクエストには最低2人のユーザーが必要です');
      return;
    }

    // 3. 友達リクエストを作成
    console.log('👥 友達リクエストを作成中...');

    // 田中 → 佐藤
    if (updatedUsers.length >= 2) {
      const { error: requestError1 } = await supabase
        .from('friend_requests')
        .upsert({
          requester_id: updatedUsers[0].id,
          requested_id: updatedUsers[1].id,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (!requestError1) {
        console.log(`✅ 友達リクエスト作成: ${updatedUsers[0].fullName} → ${updatedUsers[1].fullName}`);
      }
    }

    // 山田 → 田中
    if (updatedUsers.length >= 3) {
      const { error: requestError2 } = await supabase
        .from('friend_requests')
        .upsert({
          requester_id: updatedUsers[2].id,
          requested_id: updatedUsers[0].id,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (!requestError2) {
        console.log(`✅ 友達リクエスト作成: ${updatedUsers[2].fullName} → ${updatedUsers[0].fullName}`);
      }

      // 佐藤 ↔ 山田 (承認済み)
      const { error: acceptedRequestError } = await supabase
        .from('friend_requests')
        .upsert({
          requester_id: updatedUsers[1].id,
          requested_id: updatedUsers[2].id,
          status: 'accepted',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1日前
          updated_at: new Date().toISOString()
        });

      if (!acceptedRequestError) {
        console.log(`✅ 承認済み友達リクエスト: ${updatedUsers[1].fullName} → ${updatedUsers[2].fullName}`);

        // 友達関係を作成
        const { error: friendshipError } = await supabase
          .from('friendships')
          .upsert([
            {
              user_id: updatedUsers[1].id,
              friend_id: updatedUsers[2].id,
              created_at: new Date().toISOString()
            },
            {
              user_id: updatedUsers[2].id,
              friend_id: updatedUsers[1].id,
              created_at: new Date().toISOString()
            }
          ]);

        if (!friendshipError) {
          console.log(`✅ 友達関係作成: ${updatedUsers[1].fullName} ↔ ${updatedUsers[2].fullName}`);
        }
      }
    }

    // 4. 通知を作成
    console.log('🔔 通知を作成中...');

    const notifications = [
      {
        user_id: updatedUsers[1].id, // 佐藤
        type: 'friend_request',
        title: '友達リクエスト',
        message: `${updatedUsers[0].fullName}さんから友達リクエストが届きました`,
        read: false,
        created_at: new Date().toISOString()
      },
      {
        user_id: updatedUsers[0].id, // 田中
        type: 'friend_request',
        title: '友達リクエスト',
        message: `${updatedUsers[2].fullName}さんから友達リクエストが届きました`,
        read: false,
        created_at: new Date().toISOString()
      }
    ];

    if (updatedUsers.length >= 3) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (!notificationError) {
        console.log('✅ 通知作成完了');
      }
    }

    // 5. 犬の出会いデータを作成
    console.log('🐾 犬の出会いデータを作成中...');

    const { data: dogs } = await supabase
      .from('dogs')
      .select('id, user_id, name')
      .in('user_id', updatedUsers.map(u => u.id));

    if (dogs && dogs.length >= 2) {
      const encounters = [
        {
          user_id: dogs[0].user_id,
          dog_id: dogs[0].id,
          encountered_dog_id: dogs[1].id,
          encountered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2時間前
          location: '渋谷ドッグパーク',
          notes: 'とても仲良く遊んでいました',
          created_at: new Date().toISOString()
        }
      ];

      if (dogs.length >= 3) {
        encounters.push({
          user_id: dogs[1].user_id,
          dog_id: dogs[1].id,
          encountered_dog_id: dogs[2].id,
          encountered_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1日前
          location: '代々木公園',
          notes: '初対面でしたが、すぐに仲良くなりました',
          created_at: new Date().toISOString()
        });
      }

      const { error: encounterError } = await supabase
        .from('dog_encounters')
        .insert(encounters);

      if (!encounterError) {
        console.log('✅ 出会いデータ作成完了');
      }
    }

    console.log('🎉 テストデータの作成が完了しました!');
    
    // 結果を確認
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: dogs } = await supabase.from('dogs').select('*');
    const { data: friendRequests } = await supabase.from('friend_requests').select('*');
    const { data: friendships } = await supabase.from('friendships').select('*');
    const { data: notifications } = await supabase.from('notifications').select('*');
    
    console.log('📊 データ概要:');
    console.log(`- ユーザー: ${profiles?.length || 0}人`);
    console.log(`- 犬: ${dogs?.length || 0}匹`);
    console.log(`- 友達リクエスト: ${friendRequests?.length || 0}件`);
    console.log(`- 友達関係: ${friendships?.length || 0}件`);
    console.log(`- 通知: ${notifications?.length || 0}件`);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// スクリプトとして実行
createTestData();

export { createTestData };
