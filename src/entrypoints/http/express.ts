import express, { Express } from 'express';
import { registerPaypalMiddleware } from './middlewares/paypalMiddleware';
import { HandleOrderPaid } from '../../core/usecase/HandleOrderPaid';
import bodyParser from 'body-parser';
import { PaypalPaymentService } from '../../providers/services/PaypalPaymentService';

export function initializeExpress(dependencies: {
    handleOrderPaid: HandleOrderPaid
    paypalService: PaypalPaymentService
}): Express {
    const { handleOrderPaid, paypalService } = dependencies;
    const app = express();
    const PORT = process.env.HTTP_PORT || 3000;

    app.use(express.json());
    app.use(bodyParser.json({
        verify: (req: any, res, buf) => {
            req.rawBody = buf.toString(); // Save raw body for PayPal verification
        }
    }));

    registerPaypalMiddleware({
        app,
        handleOrderPaid,
        paypalService
    })

    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            console.log(`🚀 TF2-QuickServer listening at http://localhost:${PORT}/`);
        });
    }

    return app;
}