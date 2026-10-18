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

# 2. Check for Docker
echo -n "🔍 Checking for Docker... "
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}NOT FOUND${NC}"
    echo ""
    echo -e "${YELLOW}Docker is required to run Wcrm Community Edition.${NC}"
    
    if [ "$MACHINE" = "Linux" ] && [ -f /etc/debian_version ]; then
        echo -e "Would you like this script to install Docker automatically via the official Docker script? [y/N]"
        read -r INSTALL_DOCKER_CHOICE
        if [[ "$INSTALL_DOCKER_CHOICE" =~ ^[Yy]$ ]]; then
            echo -e "📦 Installing Docker..."
            curl -fsSL https://get.docker.com | sh
            sudo usermod -aG docker "$USER" 2>/dev/null || true
            echo -e "${GREEN}✓ Docker installed successfully.${NC}"
        else
            echo -e "${RED}Please install Docker from https://docs.docker.com/get-docker/ and run this script again.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Please install Docker Desktop from https://www.docker.com/products/docker-desktop/ and run this script again.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ OK${NC} ($(docker --version))"
fi

# 3. Check for Docker Compose
echo -n "🔍 Checking for Docker Compose... "
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    echo -e "${GREEN}✓ OK${NC} ($($COMPOSE_CMD version))"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}✓ OK${NC} ($(docker-compose --version))"
else
    echo -e "${RED}NOT FOUND${NC}"
    echo -e "${RED}Please install Docker Compose plugin: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

# 4. Check if Docker Daemon is running
echo -n "🔍 Checking Docker Daemon status... "
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}NOT RUNNING${NC}"
    echo -e "${RED}Docker service is not running. Please start Docker and run this script again.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Running${NC}"
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
