import {
  addOfficeService,
  getOfficesService,
  updateOfficeService,
  deleteOfficeService
} from '../services/officeService.js';

// ------------------------- ADD OFFICE -------------------------
export const addOffice = async (req, res) => {
  try {
    const { name, latitude, longitude, radius } = req.body;
    if (!name || !latitude || !longitude || !radius) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const office = await addOfficeService(name, latitude, longitude, radius);
    console.log('Office added successfully:', office);
    return res.status(201).json({ message: 'Office added', office });
  } catch (error) {
    console.error('Error adding office:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ------------------------- GET OFFICES -------------------------
export const getOffices = async (req, res) => {
  try {
    const offices = await getOfficesService();
    console.log('Offices fetched successfully:', offices);
    return res.status(200).json(offices);
  } catch (error) {
    console.error('Error fetching offices:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ------------------------- UPDATE OFFICE -------------------------
export const updateOffice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Office ID is required' });

    const updates = req.body;
    const office = await updateOfficeService(id, updates);
    console.log('Office updated successfully:', office);
    return res.status(200).json({ message: 'Office updated', office });
  } catch (error) {
    console.error('Error updating office:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ------------------------- DELETE OFFICE -------------------------
export const deleteOffice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Office ID is required' });

    const office = await deleteOfficeService(id);
    console.log('Office deleted successfully:', office);
    return res.status(200).json({ message: 'Office deleted', office });
  } catch (error) {
    console.error('Error deleting office:', error);
    return res.status(500).json({ message: error.message });
  }
};
