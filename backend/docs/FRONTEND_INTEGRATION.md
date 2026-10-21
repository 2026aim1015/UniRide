# Frontend integration checklist

1. Configure the same Supabase project in the frontend login/signup code and backend `.env`.
2. After login, retrieve the current Supabase session access token.
3. Send it to the backend as `Authorization: Bearer <access_token>`.
4. Set the backend base URL to `http://127.0.0.1:8000/api/v1` during local development.
5. Map frontend bicycle records to `GET /bicycles`; rides to `GET /rides/me`; reports to `POST /reports`.
6. Do not store Supabase service-role credentials in Vite environment variables.
7. The frontend's existing mock `api.ts` is not changed by this package. Wire it to these routes in a separate integration change after agreeing on response shapes.
