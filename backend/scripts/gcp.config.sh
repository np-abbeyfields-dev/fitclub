#!/bin/bash

# Centralized GCP configuration for FitClub
# GCP project: fitclub-488901

export GCP_PROJECT_ID="${GCP_PROJECT_ID:-fitclub-488901}"
export GCP_REGION="${GCP_REGION:-us-west1}"

# Cloud Run
export SERVICE_NAME="${SERVICE_NAME:-fitclub-api}"

# Cloud SQL (minimal instance: one instance, one DB for dev)
export DB_INSTANCE="${DB_INSTANCE:-fitclub}"
export DB_NAME="${DB_NAME:-fitclub}"
export DB_USER="${DB_USER:-fitclub_user}"

# Artifact Registry (avoids gcr.io createOnPush permission)
export AR_REPO="${AR_REPO:-fitclub-api}"
export IMAGE_NAME="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/${SERVICE_NAME}:latest"

# Derived
export CONNECTION_NAME="${GCP_PROJECT_ID}:${GCP_REGION}:${DB_INSTANCE}"
