const http = require('http');
const options = {
	host: process.env.HOST || 'localhost',
	port: process.env.PORT || 3000,
	path: '/health',
	timeout: 2e3,
};

const healthCheck = http.request(options, (res) => {
	console.log(`HEALTHCHECK STATUS: ${res.statusCode}`);
	if (res.statusCode === 200) {
		process.exit(0);
	} else {
		process.exit(1);
	}
});

healthCheck.on('error', function (err) {
	console.log('ERROR');
	console.error(err);
	process.exit(1);
});

healthCheck.end();
