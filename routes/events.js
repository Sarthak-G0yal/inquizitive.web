import {eventRegistration,accessingquizroom,accessingquizroombykey} from "../controllers/eventRegistrationController.js";
import express from "express"

const router = express.Router();

router.post('/eventRegistration',eventRegistration);
router.post('/accessingquizroom',accessingquizroom);
router.post("/accessingquizroombykey",accessingquizroombykey)

 export default router;