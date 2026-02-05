FROM ubuntu:20.04

# Set up working directory
WORKDIR /proxy

# Install curl and ca-certificates, necessary for NodeSource setup script
RUN apt-get update && apt-get install -y curl ca-certificates

# Setup NodeSource repository and install Node.js
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs

# Install all apt-based deps
RUN apt-get upgrade -y
RUN apt-get install -y python3
RUN apt-get install -y python3-pip

# Install pip dependencies
RUN pip3 install Werkzeug==2.2.2
RUN pip3 install mitmproxy
RUN pip3 install bs4
RUN pip3 install tldextract
RUN pip3 install warcio
RUN pip3 install psycopg2-binary

# Install npm dependencies
COPY package.json .
RUN npm install
RUN npm install -g typescript
RUN npm install @babel/preset-env --save-dev

# Copy project files
COPY src ./src
COPY scripts ./scripts
COPY analysis ./analysis
COPY conf ./conf
COPY entrypoint.sh .
COPY babelrc .
COPY babelrc_chromium73 .

# Set up project dependencies
COPY modify_jalangi_var.py .
#RUN cd analysis/jalangi2-pse && ./build.sh # UNCOMMENT ME if you want to instrument pages, needs access to the jalangi2-pse repo
RUN python3 modify_jalangi_var.py

RUN npm uninstall babel
RUN npm install --save-dev @babel/core @babel/cli

# Expose the proxy ports
EXPOSE 8001
EXPOSE 8002
EXPOSE 8314
EXPOSE 8315
EXPOSE 8316

# Entrypoint: mitmdump
ENTRYPOINT [ "/proxy/entrypoint.sh" ]
