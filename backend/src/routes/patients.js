const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdminOnlyLegacy } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/patients
// Get all patients with search, filtering, and database-level pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gender && gender !== 'All') {
      where.gender = { equals: gender, mode: 'insensitive' };
    }

    // Execute queries in parallel to get paginated results and total count
    const [patients, totalPatients] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    const totalPages = Math.ceil(totalPatients / limit);

    res.json({
      success: true,
      patients,
      pagination: {
        page,
        limit,
        totalPatients,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Fetch patients error:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// GET /api/patients/:id
// Get patient details by ID along with their appointments and doctor details.
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: {
            doctor: {
              select: { id: true, name: true, specialization: true, department: true }
            }
          },
          orderBy: { appointmentDate: 'desc' }
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Fetch patient details error:', error);
    res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

// POST /api/patients (Register patient)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

    // INCONSISTENT VALIDATION:
    // Email is nullable in schema, but here we only check missing fields.
    // No regex to check telephone number formats, allowing random strings like "abc" to be stored!
    if (!name || !phoneNumber || !age || !gender) {
      return res.status(400).json({ error: 'Name, phoneNumber, age, and gender are required.' });
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        email: email || null,
        phoneNumber,
        age: parseInt(age),
        gender,
        medicalHistory: medicalHistory || null, // Can be null, will crash UI without optional chaining
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register patient', details: error.message });
  }
});

// DELETE /api/patients/:id
// SECURITY BUG: The route relies on authorizeAdminOnlyLegacy, which has the bypassed admin validation check!
// This allows any receptionist or doctor to delete a patient.
router.delete('/:id', authenticate, authorizeAdminOnlyLegacy, async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await prisma.patient.delete({ where: { id } });

    res.json({ message: `Successfully deleted patient ${patient.name}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete patient', details: error.message });
  }
});

module.exports = router;
