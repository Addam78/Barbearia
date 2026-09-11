import { config } from 'dotenv';

// Carrega .env.test em cada worker do Vitest ANTES de qualquer import do app.
// O Vitest não carrega arquivos .env automaticamente, e o ConfigModule do Nest
// (dotenv, override:false) não sobrescreve o que já estiver em process.env.
config({ path: '.env.test', override: true });
