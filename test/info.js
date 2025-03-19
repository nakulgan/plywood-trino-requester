const DOCKER_MACHINE = 'localhost';

exports.trinoHost = `${DOCKER_MACHINE}:8080`;
exports.trinoUser = 'trino';
exports.trinoPassword = 'datazoo';
exports.trinoCatalog = 'tpch';
exports.trinoSchema = 'sf1';
