import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import clientsRouter from "./clients";
import tasksRouter from "./tasks";
import incomeRouter from "./income";
import expensesRouter from "./expenses";
import goalsRouter from "./goals";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(clientsRouter);
router.use(tasksRouter);
router.use(incomeRouter);
router.use(expensesRouter);
router.use(goalsRouter);
router.use(dashboardRouter);

export default router;
