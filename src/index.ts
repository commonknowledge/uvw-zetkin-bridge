import '../env'
import createServer from './server';
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const shouldMultithread = process.env.NODE_ENV === 'production'

function exitHandler({ cleanup, exit, workers }, exitCode) {
  for (const worker of workers) {
    console.log(`Killing process ${worker.id}`)
    worker.kill();
  }
  if (cleanup) console.log('clean');
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (exit) process.exit();
}

if (cluster.isMaster && shouldMultithread) {
  console.log(`Master ${process.pid} is running`);
  const workers = []

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    workers.push(cluster.fork())
  }

  process.on('exit', exitHandler.bind(null, {cleanup:true, workers}));
  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, {exit:true, workers}));
  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, {exit:true, workers}));
  process.on('SIGUSR2', exitHandler.bind(null, {exit:true, workers}));
  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, {exit:true, workers}));
} else {
  const app = createServer()
  const PORT = process.env.PORT || 7000
  app.listen(PORT, () => `Listening at port ${PORT}`)
}