# PitchPerfect - Fantasy Cricket App

PitchPerfect is a draft-based fantasy cricket app designed specifically for IPL enthusiasts. The app allows users to join leagues, rank players, participate in drafts, manage their teams, and trade players throughout the IPL season.

## Deployment Instructions for Railway

### Backend Deployment

1. Create a new project in Railway
2. Add a new PostgreSQL database service
3. Add a new service for the backend code
4. Connect your GitHub repository
5. Set the following environment variables:
   - `SECRET_KEY`: A secure random string for Django
   - `DEBUG`: Set to 'False' for production
   - `ALLOWED_HOSTS`: Include Railway domain (e.g., 'pitch-perfect-backend.up.railway.app')
   - `CORS_ALLOWED_ORIGINS`: Include your frontend URL (e.g., 'https://pitch-perfect-frontend.up.railway.app')
   - `CSRF_TRUSTED_ORIGINS`: Include your frontend URL (e.g., 'https://pitch-perfect-frontend.up.railway.app')
   - `CRICDATA_API_KEY`: Your Cricket API key
   - Railway automatically sets `DATABASE_URL` for you
6. Under the "Settings" tab:
   - Set the root directory to `/`
   - Set the build command to `pip install -r requirements.txt`
   - Set the start command to `cd backend && python manage.py migrate && gunicorn backend.wsgi`

### Frontend Deployment

1. Create a new service for the frontend in your Railway project
2. Connect your GitHub repository
3. Set the following environment variables:
   - `REACT_APP_API_URL`: URL of your backend API (e.g., 'https://pitch-perfect-backend.up.railway.app/api')
   - `CRICDATA_API_KEY`: Your Cricket API key
4. Under the "Settings" tab:
   - Set the root directory to `/frontend`
   - Set the build command to `npm install && npm run build`
   - Set the start command to `npx serve -s build`

### Database Migration

1. After deploying the backend, access the Railway CLI for your backend service
2. Run the following commands to migrate your database schema:
   ```bash
   cd backend
   python manage.py migrate
   ```

3. (Optional) To create an initial superuser:
   ```bash
   python manage.py createsuperuser
   ```

## Local Development Setup

1. Clone the repository
2. Set up the backend:
   ```bash
   pip install -r requirements.txt
   cd backend
   python manage.py migrate
   python manage.py runserver
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. Start the MySQL database:
   ```bash
   docker-compose up -d
   ```
