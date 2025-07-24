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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex rounded-lg justify-between bg-indigo-700 items-center border-b p-4">
          <h3 className="text-lg text-white font-semibold">Profile Details</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-700"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mr-4">
              <span className="text-indigo-800 text-2xl font-medium">
                {user.name?.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <FiMail className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center">
                <FiPhone className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p>{user.phone}</p>
                </div>
              </div>
            )}

            {user.license_number && (
              <div className="flex items-center">
                <FiUser className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">License Number</p>
                  <p>{user.license_number}</p>
                </div>
              </div>
            )}

            {(user.street || user.city || user.state) && (
              <div className="flex items-start">
                <FiMapPin className="text-gray-500 mr-3 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p>
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

            <div className="flex items-center">
              <FiCalendar className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Registered On</p>
                <p>
                  {new Date(
                    user.registration_date || user.created_at
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
