import { seedDatabase } from './seed';
import { createApp } from './app';

seedDatabase();

const app = createApp();

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});
