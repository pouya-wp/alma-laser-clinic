import { Router } from 'express';
import multer from 'multer';
import * as authCtrl from '../controllers/authController.js';
import * as apptCtrl from '../controllers/appointmentController.js';
import * as clientCtrl from '../controllers/clientController.js';
import * as analyticsCtrl from '../controllers/analyticsController.js';
import * as servicesCtrl from '../controllers/servicesController.js';
import * as settingsCtrl from '../controllers/settingsController.js';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
export const apiRouter = Router();

// Auth routes
apiRouter.post('/auth/login', authCtrl.login);
apiRouter.get('/auth/me', authCtrl.getMe);

// Appointments
apiRouter.get('/appointments', apptCtrl.getAppointments);
apiRouter.post('/appointments', apptCtrl.createAppointment);
apiRouter.patch('/appointments/:id/status', apptCtrl.updateAppointmentStatus);
apiRouter.patch('/appointments/:id', apptCtrl.updateAppointment);
apiRouter.delete('/appointments/:id', apptCtrl.deleteAppointment);

// Clients & CRM
apiRouter.get('/clients', clientCtrl.getClients);
apiRouter.get('/clients/:id', clientCtrl.getClientById);
apiRouter.post('/clients', clientCtrl.createClient);
apiRouter.put('/clients/:id', clientCtrl.updateClient);
apiRouter.post('/clients/import', upload.single('file'), clientCtrl.bulkImportClients);

// Analytics
apiRouter.get('/analytics/dashboard', analyticsCtrl.getDashboardStats);

// Services, Packages, Devices, Operators
apiRouter.get('/packages', servicesCtrl.getPackages);
apiRouter.post('/packages', servicesCtrl.createPackage);
apiRouter.put('/packages/:id', servicesCtrl.updatePackage);
apiRouter.get('/operators', servicesCtrl.getOperators);
apiRouter.get('/devices', servicesCtrl.getDevices);

// Settings & Broadcast
apiRouter.get('/settings', settingsCtrl.getSettings);
apiRouter.put('/settings', settingsCtrl.updateSettings);
apiRouter.post('/broadcast', settingsCtrl.sendBroadcast);
