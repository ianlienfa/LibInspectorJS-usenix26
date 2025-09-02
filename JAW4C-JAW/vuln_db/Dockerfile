# This works with the vulndb-only docker compose file

# Use official Postgres 16 image as base
FROM postgres:16

# Install build dependencies and pg-semver
RUN apt-get update && \
    apt-get install -y git make gcc postgresql-server-dev-16 wget && \
    apt-get install -y python3 python3 python3-pip libpq-dev && \
    apt-get install -y zip && \
    wget -O /tmp/postgrest-v13.0.5-ubuntu-aarch64.tar.xz https://github.com/PostgREST/postgrest/releases/download/v13.0.5/postgrest-v13.0.5-ubuntu-aarch64.tar.xz && \
    git clone https://github.com/theory/pg-semver.git /tmp/pg-semver && \
    cd /tmp/pg-semver && make && make install && \
    rm -rf /tmp/pg-semver && \
    apt-get remove -y git make gcc postgresql-server-dev-16 wget && \
    apt-get autoremove -y && apt-get clean
 
WORKDIR /app
RUN  tar Jxf /tmp/postgrest-v13.0.5-ubuntu-aarch64.tar.xz