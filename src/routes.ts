import { Router } from 'express';
import { init } from './cache';

const routes = Router();

init();

routes.get('/', async (req, res) => {
    return res.json('hello');
});

export default routes;