#!/bin/bash

set -e

./create_test_branch.sh "$1" "$2"

mkdir -p "runs/$2/$3"

#export PATH=/sbin:/bin:/usr/sbin:/usr/bin
echo $PATH
echo $HOME
export DAALA_ROOT=daala/

echo Building...
case $CODEC in
  daala)
    pushd $DAALA_ROOT
    gcc -print-prog-name=cc1
    gcc -print-search-dirs
    ./autogen.sh; ./configure --enable-static --disable-shared --disable-player --disable-dump-images --enable-logging --enable-dump-recons ; make -j4
    popd
    ;;
  thor)
    pushd thor/
    make
    popd
    ;;
esac

cd rd_tool
DAALA_ROOT=../daala python3 -u rd_tool.py -codec $CODEC -prefix "../runs/$2/$3" "$3"
DAALA_ROOT=../daala python3 -u rd_tool.py -codec $CODEC -mode 'ab' -runid "$RUN_ID" "$3"
