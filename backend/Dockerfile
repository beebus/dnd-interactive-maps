FROM python:3.14

WORKDIR /app
COPY . .
RUN pip install --upgrade pip && pip install -r requirements.txt

CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
