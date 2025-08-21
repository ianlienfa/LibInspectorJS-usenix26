#!/bin/sh

brew install mysql-client pkg-config
export PKG_CONFIG_PATH="$(brew --prefix)/opt/mysql-client/lib/pkgconfig"
export LDFLAGS="-L$(brew --prefix)/lib -L$(brew --prefix)/opt/openssl/lib"
export CPPFLAGS="-I$(brew --prefix)/include -I$(brew --prefix)/opt/openssl/include" 
pip3 install ultraimport urllib3==1.26.6 selenium==4.24.0 pandas mysqlclient==2.0.0 python-dotenv pyramid_chameleon