import { Link } from 'react-router-dom';
import Card from '../Card';
import { ChevronRight } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  count: number | string;
  label: string;
  linkTo: string;
  linkText: string;
  iconColor: string;
}

export function StatCard({ icon, count, label, linkTo, linkText, iconColor }: StatCardProps) {
  return (
    <Link to={linkTo} className="block">
      <Card className="text-center p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className={`w-8 h-8 ${iconColor} mx-auto mb-2`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
        <p className="text-sm text-gray-600">{label}</p>
        <div className="mt-3 text-blue-600 text-sm flex items-center justify-center">
          <span>{linkText}</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </Card>
    </Link>
  );
}