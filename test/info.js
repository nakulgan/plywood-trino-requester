const DOCKER_MACHINE = 'localhost';

exports.trinoHost = `${DOCKER_MACHINE}:8080`;
exports.trinoUser = 'trino';
exports.trinoPassword = 'datazoo';
exports.trinoCatalog = 'tpch';
// Using the schema from the config.yaml
exports.trinoSchema = 'tiny';
