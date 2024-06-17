const { Client } = require('@elastic/elasticsearch');

// Creating a new Elasticsearch client instance using environment variables for host and port
const client = new Client({
    node: `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`
});

module.exports = client;
