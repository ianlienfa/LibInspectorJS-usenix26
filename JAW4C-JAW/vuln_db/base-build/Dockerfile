# Use official Postgres 16 image as base
FROM postgres:16

COPY advisories.zip /app/advisories.zip

# Install build dependencies and pg-semver
RUN apt-get update && \
    apt-get install -y git make gcc postgresql-server-dev-16 && \
    apt-get install -y python3 python3 python3-pip && \
    apt-get install -y zip && \
    git clone https://github.com/theory/pg-semver.git /tmp/pg-semver && \
    cd /tmp/pg-semver && make && make install && \
    rm -rf /tmp/pg-semver && \
    apt-get remove -y git make gcc postgresql-server-dev-16 && \
    apt-get autoremove -y && apt-get clean

RUN unzip /app/advisories.zip 
RUN ln -s /advisories /app/advisories

# Install dependencies
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN pip install psycopg2-binary --break-system-packages
