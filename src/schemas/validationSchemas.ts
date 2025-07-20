import { z } from 'zod';

// 共通のバリデーション関数
const japanesePhoneNumber = z
  .string()
  .regex(
    /^(\+81|0)[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}$/,
    '正しい電話番号の形式で入力してください'
  );

const japanesePostalCode = z
  .string()
  .regex(
    /^\d{3}-?\d{4}$/,
    '正しい郵便番号の形式で入力してください（例: 123-4567）'
  );

const emailSchema = z
  .string()
  .email('正しいメールアドレスの形式で入力してください')
  .min(1, 'メールアドレスは必須です');

const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'パスワードは大文字・小文字・数字を含む必要があります'
  );

// 認証関連のスキーマ
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'パスワードを入力してください'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
    name: z.string().min(1, '名前を入力してください'),
    agreedToTerms: z.boolean().refine((val) => val === true, {
      message: '利用規約に同意してください',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

// プロフィール関連のスキーマ
export const profileSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: emailSchema,
  phone: japanesePhoneNumber.optional(),
  postal_code: japanesePostalCode.optional(),
  address: z.string().optional(),
  bio: z.string().max(500, '自己紹介は500文字以内で入力してください').optional(),
});

// 犬の情報スキーマ
export const dogProfileSchema = z.object({
  name: z.string().min(1, '犬の名前を入力してください'),
  breed: z.string().min(1, '犬種を選択してください'),
  age: z
    .number()
    .min(0, '年齢は0歳以上で入力してください')
    .max(30, '年齢は30歳以下で入力してください'),
  weight: z
    .number()
    .min(0.1, '体重は0.1kg以上で入力してください')
    .max(100, '体重は100kg以下で入力してください'),
  gender: z.enum(['male', 'female']),
  neutered: z.boolean().optional(),
  description: z.string().max(1000, '説明は1000文字以内で入力してください').optional(),
  medical_notes: z.string().max(1000, '医療記録は1000文字以内で入力してください').optional(),
});

// 商品関連のスキーマ
export const productSchema = z.object({
  name: z.string().min(1, '商品名を入力してください'),
  description: z.string().min(1, '商品説明を入力してください'),
  price: z
    .number()
    .min(0, '価格は0円以上で入力してください')
    .max(1000000, '価格は100万円以下で入力してください'),
  category: z.enum(['フード', 'おやつ', 'おもちゃ', 'アクセサリー', 'ケア用品', '業務用品']),
  stock_quantity: z
    .number()
    .min(0, '在庫数は0個以上で入力してください')
    .max(99999, '在庫数は99999個以下で入力してください'),
  images: z
    .array(z.string().url('正しいURL形式で入力してください'))
    .max(10, '画像は最大10枚まで登録できます')
    .optional(),
  active: z.boolean().default(true),
});

// ドッグパーク関連のスキーマ
export const dogParkSchema = z.object({
  name: z.string().min(1, 'パーク名を入力してください'),
  description: z.string().min(1, 'パーク説明を入力してください'),
  address: z.string().min(1, '住所を入力してください'),
  postal_code: japanesePostalCode,
  phone: japanesePhoneNumber.optional(),
  email: emailSchema.optional(),
  latitude: z
    .number()
    .min(-90, '緯度は-90度以上で入力してください')
    .max(90, '緯度は90度以下で入力してください'),
  longitude: z
    .number()
    .min(-180, '経度は-180度以上で入力してください')
    .max(180, '経度は180度以下で入力してください'),
  opening_hours: z.string().optional(),
  facilities: z
    .array(z.string())
    .max(20, '設備は最大20個まで選択できます')
    .optional(),
  rules: z.string().max(2000, 'ルールは2000文字以内で入力してください').optional(),
  capacity: z
    .number()
    .min(1, '定員は1名以上で入力してください')
    .max(1000, '定員は1000名以下で入力してください'),
  hourly_rate: z
    .number()
    .min(0, '時間料金は0円以上で入力してください')
    .max(10000, '時間料金は10000円以下で入力してください')
    .optional(),
});

// 予約関連のスキーマ（簡略版）
export const reservationSchema = z
  .object({
    park_id: z.string().min(1, 'パークを選択してください'),
    dog_id: z.string().min(1, '犬を選択してください'),
    start_time: z.string().min(1, '開始時刻を選択してください'),
    end_time: z.string().min(1, '終了時刻を選択してください'),
    notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
  });

// お問い合わせフォームのスキーマ
export const contactSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: emailSchema,
  subject: z.string().min(1, '件名を入力してください'),
  message: z
    .string()
    .min(10, 'メッセージは10文字以上で入力してください')
    .max(2000, 'メッセージは2000文字以内で入力してください'),
  category: z.enum(['一般', 'サポート', 'バグ報告', '機能要求', 'その他']),
});

// 支払い関連のスキーマ
export const paymentSchema = z.object({
  amount: z
    .number()
    .min(1, '金額は1円以上で入力してください')
    .max(1000000, '金額は100万円以下で入力してください'),
  currency: z.enum(['JPY']).default('JPY'),
  payment_method: z.enum(['card', 'bank_transfer']),
});

// 型エクスポート
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type DogProfileFormData = z.infer<typeof dogProfileSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type DogParkFormData = z.infer<typeof dogParkSchema>;
export type ReservationFormData = z.infer<typeof reservationSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;

// バリデーション用ヘルパー関数
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

export const safeValidateData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}; 