import { Router, type IRouter } from "express";
import healthRouter from "./health";
import safemapRouter from "./safemap";

const router: IRouter = Router();

router.use(healthRouter);
router.use(safemapRouter);

export default router;
