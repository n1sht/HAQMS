const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// Highly inefficient nested loop aggregate reporting for admin/receptionists dashboard
// PERFORMANCE BUG: Performs multiple nested DB queries inside a loop for every doctor.
// Runs sequentially, blocking/scaling terrible with doctors count.
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all doctors and all aggregations in parallel (reduces DB requests to 5 total instead of 5N+1)
    const [
      doctors,
      totalAppsGroup,
      completedAppsGroup,
      cancelledAppsGroup,
      queueTokensGroup
    ] = await Promise.all([
      prisma.doctor.findMany(),
      prisma.appointment.groupBy({
        by: ['doctorId'],
        _count: { _all: true }
      }),
      prisma.appointment.groupBy({
        by: ['doctorId'],
        _count: { _all: true },
        where: { status: 'COMPLETED' }
      }),
      prisma.appointment.groupBy({
        by: ['doctorId'],
        _count: { _all: true },
        where: { status: 'CANCELLED' }
      }),
      prisma.queueToken.groupBy({
        by: ['doctorId'],
        _count: { _all: true },
        where: { createdAt: { gte: today } }
      })
    ]);

    // Map aggregates to maps for O(1) lookups
    const totalAppsMap = new Map(totalAppsGroup.map(g => [g.doctorId, g._count._all]));
    const completedAppsMap = new Map(completedAppsGroup.map(g => [g.doctorId, g._count._all]));
    const cancelledAppsMap = new Map(cancelledAppsGroup.map(g => [g.doctorId, g._count._all]));
    const queueTokensMap = new Map(queueTokensGroup.map(g => [g.doctorId, g._count._all]));

    const reportData = doctors.map(doc => {
      const totalAppointments = totalAppsMap.get(doc.id) || 0;
      const completedAppointments = completedAppsMap.get(doc.id) || 0;
      const cancelledAppointments = cancelledAppsMap.get(doc.id) || 0;
      const todayQueueSize = queueTokensMap.get(doc.id) || 0;
      const revenue = completedAppointments * doc.consultationFee;

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        todayQueueSize,
        revenue
      };
    });

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      timeTakenMs: durationMs,
      data: reportData,
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
