import React from 'react';
import {
  FiX,
  FiMail,
  FiPhone,
  FiMapPin,
  FiUser,
  FiCalendar,
} from 'react-icons/fi';

const ProfileModal = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex rounded-t-lg justify-between bg-indigo-700 items-center border-b p-3 sm:p-4 sticky top-0 z-10">
          <h3 className="text-base sm:text-lg text-white font-semibold">Profile Details</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start mb-4 sm:mb-6">
            <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center sm:mr-4 mb-3 sm:mb-0">
              <span className="text-indigo-800 text-2xl font-medium">
                {user.name?.charAt(0)}
              </span>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-lg sm:text-xl font-semibold break-words">{user.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center">
              <FiMail className="text-gray-500 mr-3 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Email</p>
                <p className="break-words">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center">
                <FiPhone className="text-gray-500 mr-3 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500">Phone</p>
                  <p className="break-words">{user.phone}</p>
                </div>
              </div>
            )}

            {user.license_number && (
              <div className="flex items-center">
                <FiUser className="text-gray-500 mr-3 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500">License Number</p>
                  <p className="break-words">{user.license_number}</p>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <FiCalendar className="text-gray-500 mr-3 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Registered On</p>
                <p>
                  {new Date(
                    user.registration_date || user.created_at
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>

            {(user.street || user.city || user.state || user.postal_code) && (
              <div className="flex items-start sm:col-span-2">
                <FiMapPin className="text-gray-500 mr-3 mt-1 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500">Address</p>
                  <p className="break-words">
                    {user.street && (
                      <>
                        {user.street},<br />
                      </>
                    )}
                    {user.city && <>{user.city}, </>}
                    {user.state && <>{user.state} - </>}
                    {user.postal_code}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
