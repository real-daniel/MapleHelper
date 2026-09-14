# syntax=docker/dockerfile:1

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline

COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN python3 -m venv /opt/maplehelper-python \
    && /opt/maplehelper-python/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/maplehelper-python/bin/pip install --no-cache-dir -r requirements.txt \
    && groupadd --system maplehelper \
    && useradd --system --gid maplehelper --home-dir /app maplehelper

ENV PATH="/opt/maplehelper-python/bin:${PATH}"

COPY --chown=maplehelper:maplehelper scripts ./scripts
COPY --from=build --chown=maplehelper:maplehelper /workspace/target/maplehelper-backend-0.1.0-SNAPSHOT.jar ./app.jar

USER maplehelper
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
