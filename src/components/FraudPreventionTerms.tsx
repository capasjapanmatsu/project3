import { AlertTriangle, Eye, Shield } from 'lucide-react';
import { useState } from 'react';
import Button from './Button';
import Card from './Card';

interface FraudPreventionTermsProps {
  onAccept: () => void;
  onDecline: () => void;
  isVisible: boolean;
}

export function FraudPreventionTerms({ onAccept, onDecline, isVisible }: FraudPreventionTermsProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isVisible) return null;

  const handleAccept = () => {
    if (agreedToTerms && hasReadTerms) {
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Shield className="w-8 h-8 text-red-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              不正利用防止に関する重要なお知らせ
            </h2>
          </div>

          <div className="space-y-6">
            {/* 警告セクション */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-2">重要：初月無料は初回登録者限定です</p>
                  <p>
                    複数アカウントの作成による初月無料の重複利用は、利用規約違反となり、
                    アカウント停止・強制退会の対象となります。
                  </p>
                </div>
              </div>
            </div>

            {/* 禁止事項 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">禁止事項</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>複数のアカウントを作成して初月無料を重複利用すること</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>他人名義のクレジットカードを使用して登録すること</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>虚偽の個人情報を使用してアカウントを作成すること</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>技術的手段を用いてシステムを回避・悪用すること</span>
                </li>
              </ul>
            </div>

            {/* 検知システム */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">不正検知システム</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Eye className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">
                      当サービスでは、不正利用を防止するため以下の情報を収集・分析しています：
                    </p>
                    <ul className="space-y-1 ml-4">
                      <li>• デバイス識別情報（ブラウザ、画面解像度、タイムゾーンなど）</li>
                      <li>• IPアドレス</li>
                      <li>• クレジットカード情報（Stripe経由での安全な処理）</li>
                      <li>• 利用パターンの分析</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* ペナルティ */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">違反時のペナルティ</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-yellow-800">
                  <li>• <strong>警告</strong>：初回違反の場合、警告を行います</li>
                  <li>• <strong>利用制限</strong>：重複アカウントの利用停止</li>
                  <li>• <strong>強制退会</strong>：悪質な場合、全アカウントの永久停止</li>
                  <li>• <strong>法的措置</strong>：詐欺行為と判断される場合、法的手段を検討</li>
                </ul>
              </div>
            </div>

            {/* 正当な利用について */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">正当な利用について</h3>
              <p className="text-sm text-gray-700 mb-3">
                以下の場合は正当な利用として扱われます：
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• ご家族で別々のアカウントを作成する場合</li>
                <li>• 引っ越し等でIPアドレスが変更になった場合</li>
                <li>• デバイスの買い替え等で機器情報が変更になった場合</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                ※正当な利用であっても、一時的に制限がかかる場合があります。
                その際はサポートまでご連絡ください。
              </p>
            </div>

            {/* 同意チェックボックス */}
            <div className="space-y-4 pt-4 border-t">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={hasReadTerms}
                  onChange={(e) => setHasReadTerms(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  上記の内容をすべて読み、理解しました
                </span>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  <strong>不正利用防止規約に同意し、適正な利用を行うことを誓約します</strong>
                </span>
              </label>
            </div>

            {/* ボタン */}
            <div className="flex space-x-4 pt-4">
              <Button
                onClick={handleAccept}
                disabled={!hasReadTerms || !agreedToTerms}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
              >
                同意してサブスクリプションに進む
              </Button>
              <Button
                onClick={onDecline}
                variant="secondary"
                className="flex-1"
              >
                同意しない（キャンセル）
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 