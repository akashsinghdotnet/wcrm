#!/usr/bin/env bash
# ==============================================================================
# Wcrm Open-Source Edition — 1-Step Automated Installer
# https://github.com/akashsinghdotnet/wcrm
# ==============================================================================

set -e

# ANSI Color Codes
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Determine installation directory (current directory or wcrm clone)
INSTALL_DIR="$(pwd)"

clear 2>/dev/null || true

echo -e "${GREEN}${BOLD}"
cat << "EOF"
 __        __                       
 \ \      / /___ _ __ _ __ ___   
  \ \ /\ / // __| '__| '_ ` _ \  
   \ V  V /| (__| |  | | | | | | 
    \_/\_/  \___|_|  |_| |_| |_| 
EOF
echo -e "${NC}"
echo -e "${CYAN}${BOLD}The Modern Open-Source WhatsApp Cloud API CRM${NC}"
echo -e "${BLUE}https://wcrm.si • Community Edition Installer${NC}"
echo -e "================================================================="
echo ""

# 1. Check Operating System
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE="Linux";;
    Darwin*)    MACHINE="Mac";;
    *)          MACHINE="UNKNOWN";;
esac

echo -e "🔍 Detected Operating System: ${BOLD}${MACHINE}${NC}"

# Helper function to check if docker command works (with or without sudo)
check_docker_daemon() {
    if docker info >/dev/null 2>&1; then
        return 0
    elif sudo docker info >/dev/null 2>&1; then
        USE_SUDO=1
        return 0
    fi
    return 1
}

# 2. Check & Auto-Install Docker
echo -e "🔍 Checking container runtime..."

# Include standard Docker paths on Mac in case not yet in PATH
if [ "$MACHINE" = "Mac" ]; then
    export PATH="/Applications/Docker.app/Contents/Resources/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
fi

if ! command -v docker >/dev/null 2>&1 && [ ! -d "/Applications/Docker.app" ]; then
    echo -e "${YELLOW}⚙️  Docker is not installed. Installing automatically...${NC}"
    
    if [ "$MACHINE" = "Mac" ]; then
        # Check Homebrew
        if ! command -v brew >/dev/null 2>&1; then
            echo -e "📦 Installing Homebrew package manager..."
            NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null || true)"
        fi
        echo -e "📦 Installing Docker Desktop via Homebrew..."
        brew install --cask docker
        export PATH="/Applications/Docker.app/Contents/Resources/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
    elif [ "$MACHINE" = "Linux" ]; then
        echo -e "📦 Installing Docker via official installer..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker "$USER" 2>/dev/null || true
        sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
        sudo systemctl enable docker 2>/dev/null || true
    else
        echo -e "${RED}Unsupported OS for automated install. Please install Docker and retry.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker installation complete.${NC}"
fi

# 3. Ensure Docker Daemon is Started
if ! check_docker_daemon; then
    echo -e "${YELLOW}⚡ Docker daemon is not running. Starting Docker service...${NC}"
    if [ "$MACHINE" = "Mac" ]; then
        open -a Docker 2>/dev/null || open -a /Applications/Docker.app 2>/dev/null || true
    elif [ "$MACHINE" = "Linux" ]; then
        sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
    fi

    echo -n "⏳ Waiting for Docker engine to become ready"
    DAEMON_WAIT=0
    MAX_DAEMON_WAIT=45
    while ! check_docker_daemon; do
        sleep 2
        DAEMON_WAIT=$((DAEMON_WAIT+1))
        echo -n "."
        if [ $DAEMON_WAIT -ge $MAX_DAEMON_WAIT ]; then
            echo ""
            echo -e "${RED}Docker is taking longer than expected to start.${NC}"
            echo -e "Please ensure Docker Desktop / service is running and re-run this script."
            exit 1
        fi
    done
    echo ""
    echo -e "${GREEN}✓ Docker engine is running.${NC}"
else
    echo -e "${GREEN}✓ Docker engine is running.${NC}"
fi

# 4. Determine Docker & Compose Commands
DOCKER_CMD="docker"
if [ "$USE_SUDO" = "1" ]; then
    DOCKER_CMD="sudo docker"
fi

echo -n "🔍 Checking Docker Compose... "
if $DOCKER_CMD compose version >/dev/null 2>&1; then
    COMPOSE_CMD="$DOCKER_CMD compose"
    echo -e "${GREEN}✓ OK${NC} ($($COMPOSE_CMD version))"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    if [ "$USE_SUDO" = "1" ]; then
        COMPOSE_CMD="sudo docker-compose"
    fi
    echo -e "${GREEN}✓ OK${NC} ($($COMPOSE_CMD --version))"
else
    echo -e "${YELLOW}Installing Docker Compose plugin...${NC}"
    if [ "$MACHINE" = "Linux" ]; then
        sudo apt-get update 2>/dev/null && sudo apt-get install -y docker-compose-plugin 2>/dev/null || true
        COMPOSE_CMD="docker compose"
    fi
fi

echo ""
echo -e "${CYAN}-----------------------------------------------------------------${NC}"
echo -e "${BOLD}⚙️  Configuring Environment & Generating Cryptographic Secrets...${NC}"
echo -e "${CYAN}-----------------------------------------------------------------${NC}"

# Helper to generate random hex secrets
generate_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
    else
        head -c 32 /dev/urandom | xxd -p | head -n 1
    fi
}

# Configure backend/.env
if [ ! -f "backend/.env" ]; then
    echo "📄 Generating backend/.env with secure random JWT and DB secrets..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
    else
        touch backend/.env
    fi

    RANDOM_JWT=$(generate_secret)
    RANDOM_DB_PASS=$(generate_secret | head -c 24)

    # Append or replace generated secrets
    if grep -q "JWT_SECRET=" backend/.env; then
        if [ "$MACHINE" = "Mac" ]; then
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=${RANDOM_JWT}/" backend/.env
        else
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=${RANDOM_JWT}/" backend/.env
        fi
    else
        echo "JWT_SECRET=${RANDOM_JWT}" >> backend/.env
    fi

    if grep -q "DB_PASSWORD=" backend/.env; then
        if [ "$MACHINE" = "Mac" ]; then
            sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=${RANDOM_DB_PASS}/" backend/.env
        else
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${RANDOM_DB_PASS}/" backend/.env
        fi
    else
        echo "DB_PASSWORD=${RANDOM_DB_PASS}" >> backend/.env
    fi

    echo -e "${GREEN}✓ backend/.env generated successfully.${NC}"
else
    echo -e "${BLUE}ℹ Existing backend/.env found. Keeping your current environment variables.${NC}"
fi

# Configure root .env for docker-compose if not present
if [ ! -f ".env" ]; then
    RANDOM_JWT_ROOT=$(generate_secret)
    RANDOM_DB_PASS_ROOT=$(generate_secret | head -c 24)
    cat << EOF > .env
# Auto-generated Wcrm Open-Source Environment
DEPLOYMENT_MODE=self_hosted
DB_USERNAME=wcrm
DB_PASSWORD=${RANDOM_DB_PASS_ROOT}
DB_NAME=wcrm
JWT_SECRET=${RANDOM_JWT_ROOT}
EOF
    echo -e "${GREEN}✓ Root .env generated for Docker Compose.${NC}"
fi

echo ""
echo -e "${CYAN}-----------------------------------------------------------------${NC}"
echo -e "${BOLD}🚀 Building and Launching Containers (PostgreSQL, Backend, Frontend)...${NC}"
echo -e "${CYAN}-----------------------------------------------------------------${NC}"

$COMPOSE_CMD up -d --build

echo ""
echo -e "⏳ Waiting for backend API to become ready..."
ATTEMPTS=0
MAX_ATTEMPTS=30
READY=0

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s "http://localhost:4000/api/settings/public" >/dev/null 2>&1 || curl -s "http://127.0.0.1:4000/api/settings/public" >/dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 2
    ATTEMPTS=$((ATTEMPTS+1))
    echo -n "."
done
echo ""

# Detect Server IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "127.0.0.1" ]; then
    SERVER_IP="localhost"
fi

echo ""
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 Wcrm Open-Source Edition is Successfully Installed!         ${NC}"
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo ""
echo -e "  ${BOLD}🌐 Web CRM Dashboard:${NC}  ${CYAN}http://${SERVER_IP}${NC} (or http://localhost)"
echo -e "  ${BOLD}⚙️  Backend API:${NC}        ${CYAN}http://${SERVER_IP}:4000/api${NC}"
echo ""
echo -e "  ${YELLOW}${BOLD}👉 NEXT STEP:${NC}"
echo -e "  Open ${BOLD}http://${SERVER_IP}${NC} in your browser to launch the ${GREEN}Initial Setup Wizard${NC}."
echo -e "  It will prompt you to create your Company and primary Administrator account."
echo ""
echo -e "  ${BLUE}Commands to manage your stack:${NC}"
echo -e "  • Stop CRM:     ${BOLD}${COMPOSE_CMD} down${NC}"
echo -e "  • View Logs:    ${BOLD}${COMPOSE_CMD} logs -f${NC}"
echo -e "  • Restart:      ${BOLD}${COMPOSE_CMD} restart${NC}"
echo ""
echo -e "${GREEN}Enjoy using Wcrm! For documentation & community, visit https://wcrm.si${NC}"
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo ""

# Auto-open browser if running locally on desktop
if [ "$MACHINE" = "Mac" ]; then
    open "http://${SERVER_IP}" 2>/dev/null || open "http://localhost" 2>/dev/null || true
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://${SERVER_IP}" 2>/dev/null || true
fi
