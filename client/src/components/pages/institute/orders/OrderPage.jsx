import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../../../context/UserContext';
import { toast } from 'react-toastify';
import {
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiX,
  FiChevronDown,
} from 'react-icons/fi';
import api from '../../../../api/api';

const OrderPage = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [institutes, setInstitutes] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitute, setSelectedInstitute] = useState('');
  const [customManufacturer, setCustomManufacturer] = useState('');
  const [showInstituteDropdown, setShowInstituteDropdown] = useState(false);
  const [newDrug, setNewDrug] = useState({
    name: '',
    quantity: 1,
    price: 0,
  });

  useEffect(() => {
    if (user?.role !== 'institute') {
      navigate('/unauthorized');
      return;
    }
    fetchInstitutes();
  }, [user]);

  const fetchInstitutes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users', {
        params: {
          role: 'institute',
        },
      });

      console.log('Institutes data:', response.data);

      if (response.data.status && response.data.institutes) {
        setInstitutes(
          response.data.institutes.filter((inst) => inst.id !== user.id)
        );
      } else {
        toast.error('No institutes found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(`Failed to load institutes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstituteDrugs = async (instituteId) => {
    try {
      setLoading(true);
      const response = await api.get('/drugs', {
        params: {
          created_by: instituteId,
        },
      });

      console.log('Drugs data:', response.data);

      if (response.data.status && response.data.drugs) {
        setDrugs(response.data.drugs);
      } else if (Array.isArray(response.data)) {
        // Handle case where endpoint returns array directly
        setDrugs(response.data);
      } else {
        toast.error('No drugs found for this institute');
        setDrugs([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(`Failed to load drugs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInstituteSelect = (institute) => {
    if (institute === 'manufacturer') {
      setSelectedInstitute('manufacturer');
      setCustomManufacturer('');
      setDrugs([]);
    } else {
      setSelectedInstitute(institute.id);
      fetchInstituteDrugs(institute.id);
    }
    setShowInstituteDropdown(false);
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
            seller_id: drug.created_by,
            seller_name: institutes.find((i) => i.id === drug.created_by)?.name,
          },
        ];
      }
    });
  };

  const addManufacturerDrugToCart = () => {
    if (!newDrug.name.trim()) {
      toast.warning('Please enter drug name');
      return;
    }

    if (!customManufacturer.trim()) {
      toast.warning('Please enter manufacturer name');
      return;
    }

    if (newDrug.price <= 0) {
      toast.warning('Please enter a valid price');
      return;
    }

    // Check for duplicate drugs
    const isDuplicate = cart.some(
      (item) =>
        item.name.toLowerCase() === newDrug.name.toLowerCase() &&
        item.manufacturer_name.toLowerCase() ===
          customManufacturer.toLowerCase()
    );

    if (isDuplicate) {
      toast.warning('This drug is already in your cart');
      return;
    }

    setCart((prevCart) => [
      ...prevCart,
      {
        drug_id: null,
        name: newDrug.name.trim(),
        quantity: newDrug.quantity,
        price: parseFloat(newDrug.price),
        manufacturer_name: customManufacturer.trim(),
      },
    ]);

    setNewDrug({ name: '', quantity: 1, price: 0 });
    toast.success('Drug added to cart');
  };

  const removeFromCart = (index) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    setCart((prevCart) =>
      prevCart.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updatePrice = (index, newPrice) => {
    if (newPrice < 0) return;
    setCart((prevCart) =>
      prevCart.map((item, i) =>
        i === index ? { ...item, price: parseFloat(newPrice) || 0 } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      if (selectedInstitute === 'manufacturer') {
        return total + item.price * item.quantity;
      }
      return total;
    }, 0);
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.warning('Please add items to your cart');
      return;
    }

    try {
      const orderData = {
        items: cart.map((item) => {
          if (selectedInstitute === 'manufacturer') {
            return {
              custom_name: item.name,
              manufacturer_name: customManufacturer,
              quantity: item.quantity,
              unit_price: item.price,
            };
          } else {
            return {
              drug_id: item.drug_id,
              quantity: item.quantity,
            };
          }
        }),
        recipient_id:
          selectedInstitute === 'manufacturer' ? null : selectedInstitute,
        transaction_type:
          selectedInstitute === 'manufacturer' ? 'manufacturer' : 'institute',
        notes,
      };

      console.log('Submitting order:', JSON.stringify(orderData, null, 2));

      const response = await api.post('/orders', orderData);

      if (response.data.status) {
        toast.success('Order placed successfully!');
        setCart([]);
        setNotes('');
        setSelectedInstitute('');
        setCustomManufacturer('');
      } else {
        throw new Error(response.data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Full order submission error:', error);
      toast.error(
        error.response?.data?.message ||
          'Error placing order. Check console for details.'
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Place New Order</h1>

      {/* Institute/Manufacturer Selection */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Select Seller</h2>
        <div className="relative">
          <div
            className="flex items-center justify-between p-2 border rounded cursor-pointer"
            onClick={() => setShowInstituteDropdown(!showInstituteDropdown)}
          >
            <span>
              {selectedInstitute === 'manufacturer'
                ? `Manufacturer (${customManufacturer || 'Enter name'})`
                : selectedInstitute
                ? institutes.find((i) => i.id === selectedInstitute)?.name
                : 'Select an institute or manufacturer'}
            </span>
            <FiChevronDown
              className={`transition-transform ${
                showInstituteDropdown ? 'rotate-180' : ''
              }`}
            />
          </div>

          {showInstituteDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
              <div className="p-2 font-semibold border-b">Institutes</div>
              {institutes.map((institute) => (
                <div
                  key={institute.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleInstituteSelect(institute)}
                >
                  {institute.name}
                </div>
              ))}
              <div
                className="p-2 hover:bg-gray-100 cursor-pointer border-t font-semibold"
                onClick={() => handleInstituteSelect('manufacturer')}
              >
                External Manufacturer
              </div>
            </div>
          )}
        </div>

        {selectedInstitute === 'manufacturer' && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manufacturer Name
            </label>
            <input
              type="text"
              placeholder="Enter manufacturer name"
              className="w-full p-2 border rounded"
              value={customManufacturer}
              onChange={(e) => setCustomManufacturer(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drug Selection Panel */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {selectedInstitute ? (
            <>
              {selectedInstitute === 'manufacturer' ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    Add Manufacturer Drugs
                  </h2>
                  <div className="border rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Drug Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter drug name"
                          className="w-full p-2 border rounded"
                          value={newDrug.name}
                          onChange={(e) =>
                            setNewDrug({ ...newDrug, name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <div className="flex items-center">
                          <button
                            onClick={() =>
                              setNewDrug({
                                ...newDrug,
                                quantity: Math.max(1, newDrug.quantity - 1),
                              })
                            }
                            className="bg-gray-200 p-1 rounded"
                            disabled={newDrug.quantity <= 1}
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="mx-2">{newDrug.quantity}</span>
                          <button
                            onClick={() =>
                              setNewDrug({
                                ...newDrug,
                                quantity: newDrug.quantity + 1,
                              })
                            }
                            className="bg-gray-200 p-1 rounded"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="Enter price"
                        className="w-full p-2 border rounded"
                        value={newDrug.price}
                        onChange={(e) =>
                          setNewDrug({
                            ...newDrug,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <button
                      onClick={addManufacturerDrugToCart}
                      className="mt-2 bg-indigo-600 text-white py-1 px-3 rounded hover:bg-indigo-700 text-sm"
                    >
                      Add to Order
                    </button>
                  </div>
                </div>
              ) : (
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

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {drugs
                        .filter((drug) =>
                          drug.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .map((drug) => (
                          <div
                            key={drug.id}
                            className="border rounded-lg p-4 flex justify-between items-center"
                          >
                            <div>
                              <h3 className="font-medium">{drug.name}</h3>
                              {/* <p className="text-sm text-gray-500">
                                Batch: {drug.batch_no}
                              </p> */}
                              {/* <p className="text-sm text-gray-500">
                                Stock: {drug.stock}
                              </p> */}
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
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Please select an institute or manufacturer first
            </div>
          )}
        </div>

        {/* Order Summary Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FiShoppingCart className="mr-2" /> Order Summary
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
                        {item.seller_name && (
                          <p className="text-xs text-gray-500">
                            From: {item.seller_name}
                          </p>
                        )}
                        {item.manufacturer_name && (
                          <p className="text-xs text-gray-500">
                            Manufacturer: {item.manufacturer_name}
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
                    {selectedInstitute === 'manufacturer' && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          className="w-full p-1 border rounded"
                          value={item.price}
                          onChange={(e) => updatePrice(index, e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
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

              {selectedInstitute === 'manufacturer' && (
                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold mb-4">
                    <span>Total:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={submitOrder}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 mt-4"
                disabled={
                  !selectedInstitute ||
                  (selectedInstitute === 'manufacturer' && !customManufacturer)
                }
              >
                Place Order
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderPage;
