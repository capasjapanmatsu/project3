import { useState } from 'react';
import AdminMaintenanceManagementComponent from '../components/admin/AdminMaintenanceManagement';

export default function AdminMaintenanceManagement() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">メンテナンス管理</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}
      
      <AdminMaintenanceManagementComponent 
        onError={setError} 
        onSuccess={setSuccess} 
      />
    </div>
  );
}
