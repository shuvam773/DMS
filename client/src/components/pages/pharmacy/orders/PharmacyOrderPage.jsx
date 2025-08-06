import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../../../context/UserContext';
import { toast } from 'react-toastify';
import {
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiX,
  FiLoader,
  FiAlertCircle,
} from 'react-icons/fi';
import api from '../../../../api/api';

const PharmacyOrderPage = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [institute, setInstitute] = useState(null);
  const [drugs, setDrugs] = useState([]);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState({
    institute: false,
    drugs: false,
    submitting: false,
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {

    if (user?.role !== 'pharmacy') {
      navigate('/unauthorized');
      return;
    }
    fetchInstitute();
  }, [user]);

  const fetchInstitute = async () => {
    try {
      setLoading((prev) => ({ ...prev, institute: true }));

      if (!user?.created_by) {
        toast.error(
          'Your pharmacy account is not associated with any institute'
        );
        setInstitute(null);
        return;
      }

      const response = await api.get(`/users/${user.created_by}`);

      if (!response.data.status || !response.data.user) {
        throw new Error('Invalid response structure');
      }

      const fetchedInstitute = response.data.user;

      // Validate that this is actually an institute/hospital
      if (
        fetchedInstitute.role !== 'institute' &&
        fetchedInstitute.role !== 'hospital'
      ) {
        throw new Error('Your parent account is not an institute');
      }

      setInstitute(fetchedInstitute);
      fetchInstituteDrugs(fetchedInstitute.id);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(`Failed to load institute: ${error.message}`);
      setInstitute(null);
    } finally {
      setLoading((prev) => ({ ...prev, institute: false }));
    }
  };

  const fetchInstituteDrugs = async (instituteId) => {
    try {
      setLoading((prev) => ({ ...prev, drugs: true }));
      const response = await api.get(`/drugs?created_by=${instituteId}`);

      if (response.data.status && response.data.drugs) {
        setDrugs(response.data.drugs.filter((drug) => drug.stock > 0));
      } else if (Array.isArray(response.data)) {
        setDrugs(response.data.filter((drug) => drug.stock > 0));
      } else {
        toast.info('No available drugs found at this institute');
        setDrugs([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(`Failed to load drugs: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, drugs: false }));
    }
  };

  const updateCartItemCategory = (index, category) => {
    setCart((prevCart) =>
      prevCart.map((item, i) => (i === index ? { ...item, category } : item))
    );
  };

  const addToCart = (drug) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.drug_id === drug.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.drug_id === drug.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            drug_id: drug.id,
            name: drug.name,
            quantity: 1,
            price: Number(drug.price),
            seller_id: drug.created_by,
            seller_name: institute?.name,
            batch_no: drug.batch_no,
            exp_date: drug.exp_date,
            category: null,
          },
        ];
      }
    });
    toast.success(`${drug.name} added to cart`);
  };

  const removeFromCart = (index) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      newCart.splice(index, 1);
      return newCart;
    });
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    setCart((prevCart) =>
      prevCart.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce(
      (total, item) => total + Number(item.price) * item.quantity,
      0
    );
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.warning('Please add items to your cart');
      return;
    }

    if (!institute) {
      toast.warning('No institute associated with your pharmacy');
      return;
    }

    const invalidItems = cart.filter(
      (item) =>
        !item.category || !['IPD', 'OPD', 'OUTREACH'].includes(item.category)
    );

    if (invalidItems.length > 0) {
      toast.warning('Please select a valid category for all items');
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, submitting: true }));

      const orderData = {
        recipient_id: institute.id,
        items: cart.map((item) => ({
          drug_id: item.drug_id,
          quantity: item.quantity,
          category: item.category,
        })),
        notes,
      };

      await api.post('/pharmacy/orders', orderData);

      toast.success('Order placed successfully!');
      setCart([]);
      setNotes('');
    } catch (error) {
      console.error('Order submission error:', error);
      toast.error(error.response?.data?.message || 'Error placing order');
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Indent to Institute</h1>

      {/* Institute Display */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Associated Institute</h2>

        {loading.institute ? (
          <div className="flex items-center justify-center p-4">
            <FiLoader className="animate-spin mr-2" />
            Loading institute information...
          </div>
        ) : institute ? (
          <div className="p-3 bg-gray-50 rounded border">
            <p className="font-medium">{institute.name}</p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">License:</span>{' '}
              {institute.license_number}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Address:</span> {institute.street},{' '}
              {institute.city}, {institute.state} - {institute.postal_code}
            </p>
          </div>
        ) : (
          <div className="p-3 bg-red-50 rounded border border-red-100">
            <div className="flex items-start">
              <FiAlertCircle className="text-red-500 mt-1 mr-2 flex-shrink-0" />
              <div>
                <p className="text-red-600 font-medium">
                  No institute association
                </p>
                <p className="text-sm text-red-500 mt-1">
                  Your pharmacy account is not linked to any institute. Please
                  contact support.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drug Selection Panel */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {institute ? (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search drugs..."
                  className="w-full p-2 border rounded"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {loading.drugs ? (
                <div className="flex justify-center py-8">
                  <FiLoader className="animate-spin h-8 w-8" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drugs
                    .filter((drug) =>
                      drug.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((drug) => (
                      <div
                        key={drug.id}
                        className="border rounded-lg p-4 flex justify-between items-center"
                      >
                        <div>
                          <h3 className="font-medium">{drug.name}</h3>
                          <p className="text-sm text-gray-500">
                            Batch: {drug.batch_no}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires:{' '}
                            {new Date(drug.exp_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Price: ₹{Number(drug.price).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Stock: {drug.stock}
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart(drug)}
                          className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
                          disabled={drug.stock <= 0}
                        >
                          <FiPlus />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No institute associated with your pharmacy account
            </div>
          )}
        </div>

        {/* Order Summary Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FiShoppingCart className="mr-2" /> Indent Summary
          </h2>

          {cart.length === 0 ? (
            <p className="text-gray-500">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity}
                        </p>
                        <p className="text-sm text-gray-600">
                          Price: ₹{Number(item.price).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Batch: {item.batch_no}
                        </p>
                        {item.exp_date && (
                          <p className="text-xs text-gray-500">
                            Expires:{' '}
                            {new Date(item.exp_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiX />
                      </button>
                    </div>
                    <div className="flex items-center mt-1">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="bg-gray-200 p-1 rounded"
                        disabled={item.quantity <= 1}
                      >
                        <FiMinus size={14} />
                      </button>
                      <span className="mx-2">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="bg-gray-200 p-1 rounded"
                      >
                        <FiPlus size={14} />
                      </button>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateCartItemCategory(index, e.target.value)
                        }
                        className="w-full p-1 text-xs border rounded"
                      >
                        <option value="">N/A</option>
                        <option value="IPD">IPD</option>
                        <option value="OPD">OPD</option>
                        <option value="OUTREACH">OUTREACH</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full p-2 border rounded"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                ></textarea>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold mb-4">
                  <span>Total:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={submitOrder}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 mt-4 flex items-center justify-center"
                disabled={!institute || loading.submitting}
              >
                {loading.submitting ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyOrderPage;
