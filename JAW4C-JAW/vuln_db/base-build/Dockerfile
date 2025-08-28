# Use official Postgres 16 image as base
FROM postgres:16

# Install build dependencies and pg-semver
RUN apt-get update && \
    apt-get install -y git make gcc postgresql-server-dev-16 && \
    git clone https://github.com/theory/pg-semver.git /tmp/pg-semver && \
    cd /tmp/pg-semver && make && make install && \
    rm -rf /tmp/pg-semver && \
    apt-get remove -y git make gcc postgresql-server-dev-16 && \
    apt-get autoremove -y && apt-get clean