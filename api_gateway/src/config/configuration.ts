export default (): any => {
	const SERVICE_NAME = 'API Gateway'; // TODO: TBD in .env?
	if (!process.env.SERVICE_NAME) {
		process.env.SERVICE_NAME = SERVICE_NAME;
	}
	return {
		port: parseInt(process.env.PORT, 10) || 3000,
	};
};
