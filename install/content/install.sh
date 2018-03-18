#!/bin/sh

# Credits: This script is heavily inspired by Yarn and nvm install scripts
# https://github.com/yarnpkg/website/blob/master/install.sh
# https://github.com/creationix/nvm/blob/v0.33.8/install.sh

set -e

base_url="https://install.run.tools"
client_dirname=".run"

reset="\033[0m"
red="\033[31m"
green="\033[32m"
yellow="\033[33m"
cyan="\033[36m"
white="\033[37m"

run_get_tarball() {
  if [ "$1" = '--version' ]; then
    # Validate that the version matches MAJOR.MINOR.PATCH to avoid garbage-in/garbage-out behavior
    if echo $2 | grep -qE "^[[:digit:]]+\.[[:digit:]]+\.[[:digit:]]+$"; then
      version=$2
    else
      printf "$red> Version number must match MAJOR.MINOR.PATCH.$reset\n"
      exit 1;
    fi
  else
    printf "$cyan> Getting the latest version number...$reset\n"
    version=`curl --fail --progress-bar --location "$base_url/releases/latest.txt"`
  fi

  if [ "$(uname -s)" == "Darwin" ]; then
    platform=macos
  elif [ "$(uname -s)" == "Linux" ]; then
    platform=linux
  else
    printf "$red> Sorry, but currently, only macOS and Linux are supported.$reset\n"
    exit 1;
  fi

  if [ "$(uname -m)" == "x86_64" ]; then
    architecture=x64
  else
    printf "$red> Sorry, but currently, only the 64-bit version of the x86 instruction set is supported.$reset\n"
    exit 1;
  fi

  tarball_filename="run-v$version-$platform-$architecture.tar.gz"
  url="$base_url/releases/$version/$tarball_filename"

  # Get the tarball
  printf "$cyan> Downloading $tarball_filename...$reset\n"
  tarball_temp=`mktemp -t run.tar.gz.XXXXXXXXXX`
  if curl --fail --progress-bar --location --output "$tarball_temp" "$url"; then
    printf "$cyan> Extracting to ~/$client_dirname/bin...$reset\n"
    # All this dance is because `tar --strip=1` does not work everywhere
    temp=$(mktemp -d run.XXXXXXXXXX)
    tar zxf "$tarball_temp" -C "$temp"
    mkdir -p $client_dirname/bin
    mv "$temp"/* $client_dirname/bin
    rm -rf "$temp"
    rm "$tarball_temp"
  else
    printf "$red> Failed to download $url.$reset\n"
    exit 1;
  fi
}

run_link() {
  printf "$cyan> Adding to \$PATH...$reset\n"
  RUN_PROFILE="$(run_detect_profile)"
  SOURCE_STR="\nexport PATH=\"\$HOME/$client_dirname/bin:\$PATH\"\n"

  if [ -z "${RUN_PROFILE-}" ] ; then
    local TRIED_PROFILE
    if [ -n "${PROFILE}" ]; then
      TRIED_PROFILE="${PROFILE} (as defined in \$PROFILE), "
    fi
    echo "$red=> Profile not found. Tried ${TRIED_PROFILE-}~/.bashrc, ~/.bash_profile, ~/.zshrc, and ~/.profile."
    echo "=> Create one of them and run this script again"
    echo "   OR"
    echo "=> Append the following lines to the correct file yourself:$reset"
    command printf "${SOURCE_STR}"
    exit 1;
  fi

  if ! grep -q "$client_dirname\/bin" "$RUN_PROFILE"; then
    if [[ $RUN_PROFILE == *"fish"* ]]; then
      command fish -c "set -U fish_user_paths \$fish_user_paths ~/$client_dirname/bin"
    else
      command printf "$SOURCE_STR" >> "$RUN_PROFILE"
    fi
    printf "$cyan> We've added the following to your $RUN_PROFILE\n"
    echo "> If this isn't the profile of your current shell then please add the following to your correct profile:"
    printf "   $SOURCE_STR$reset\n"
  fi

  version=`$HOME/$client_dirname/bin/run @version` || (
    printf "$red> Run was installed, but doesn't seem to be working :(.$reset\n"
    exit 1;
  )

  printf "$green> Successfully installed Run v$version!$reset\n"

  if [[ ! $PATH == *"$client_dirname/bin"* ]]; then
    printf "$green> Please open another terminal to make the \`run\` command available.$reset\n"
  fi
}

run_detect_profile() {
  if [ -n "${PROFILE}" ] && [ -f "${PROFILE}" ]; then
    echo "${PROFILE}"
    return
  fi

  local DETECTED_PROFILE
  DETECTED_PROFILE=''
  local SHELLTYPE
  SHELLTYPE="$(basename "/$SHELL")"

  if [ "$SHELLTYPE" = "bash" ]; then
    if [ -f "$HOME/.bashrc" ]; then
      DETECTED_PROFILE="$HOME/.bashrc"
    elif [ -f "$HOME/.bash_profile" ]; then
      DETECTED_PROFILE="$HOME/.bash_profile"
    fi
  elif [ "$SHELLTYPE" = "zsh" ]; then
    DETECTED_PROFILE="$HOME/.zshrc"
  elif [ "$SHELLTYPE" = "fish" ]; then
    DETECTED_PROFILE="$HOME/.config/fish/config.fish"
  fi

  if [ -z "$DETECTED_PROFILE" ]; then
    for EACH_PROFILE in ".profile" ".bashrc" ".bash_profile" ".zshrc"
    do
      if DETECTED_PROFILE="$(run_try_profile "${HOME}/${EACH_PROFILE}")"; then
        break
      fi
    done
  fi

  if [ ! -z "$DETECTED_PROFILE" ]; then
    echo "$DETECTED_PROFILE"
  fi
}

run_try_profile() {
  if [ -z "${1-}" ] || [ ! -f "${1}" ]; then
    return 1
  fi
  echo "${1}"
}

run_reset() {
  unset -f run_install run_reset run_get_tarball run_link run_detect_profile run_try_profile
}

run_install() {
  printf "${white}Installing Run!$reset\n"
  run_get_tarball $1 $2
  run_link
  run_reset
}

cd ~
run_install $1 $2
