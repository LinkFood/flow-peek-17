# 🚂 Deploy Natural Flow to Railway

## Why Railway?

- Free tier with 500 hours/month (enough for 24/7 operation)
- Auto-detects Spring Boot projects
- Built-in PostgreSQL database
- Easy environment variable management
- Deploys directly from GitHub
- No credit card required for free tier

## Step-by-Step Deployment

### 1. Sign Up for Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign in with GitHub (recommended - connects your repos automatically)

### 2. Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `flow-peek-17` repository
4. Railway will auto-detect the Spring Boot backend in `/backend` folder

### 3. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will create a database and provide connection string
4. The backend will automatically use Railway's DATABASE_URL

### 4. Configure Environment Variables

Click on your backend service, go to "Variables" tab, and add:

```
POLYGON_API_KEY=your_polygon_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
POLYGON_ENABLED=true
OPENAI_MODEL=gpt-4
SPRING_PROFILES_ACTIVE=prod
```

**Note:** Replace `your_polygon_api_key_here` and `your_openai_api_key_here` with your actual API keys.
You have these keys saved in your local `backend/start-with-keys.sh` file.

### 5. Deploy

1. Railway will automatically deploy when you push to GitHub
2. First deployment takes 3-5 minutes
3. You'll get a public URL like: `https://natural-flow-production.up.railway.app`

### 6. Update Frontend

Update your frontend to use the Railway backend:

1. Edit `/Users/jameschellis/flow-peek-17/.env.local`:
```
VITE_API_URL=https://your-railway-url.up.railway.app/api/flow
```

2. Push changes to trigger Lovable redeployment

### 7. Verify Deployment

Check these endpoints:
- `https://your-railway-url.up.railway.app/api/flow/tickers` - Should return list of tickers
- `https://your-railway-url.up.railway.app/api/flow/latest?symbol=QQQ&limit=10` - Should return flow data

## What Happens After Deployment

1. Backend starts and connects to PostgreSQL
2. PolygonService begins polling every 5 seconds
3. Options trades are ingested and stored
4. Frontend can query flow data
5. AI insights become available

## Monitoring

Railway provides:
- **Logs**: See Polygon polling activity and any errors
- **Metrics**: CPU, memory, network usage
- **Database**: Query your PostgreSQL directly

## Cost Estimates

**Free Tier:**
- 500 hours/month of backend runtime (enough for 24/7)
- $5 worth of usage included
- Perfect for getting started

**If You Exceed Free Tier:**
- ~$5-10/month for backend
- ~$5/month for PostgreSQL
- Total: ~$10-15/month for unlimited usage

**External Costs:**
- Polygon API: $0-29/month depending on plan
- OpenAI: ~$20-50/month with GPT-4 (varies by usage)

## Alternative: Render.com

If Railway doesn't work, Render is also excellent:

1. Sign up: https://render.com
2. New → Web Service → Connect GitHub
3. Build command: `cd backend && mvn clean package`
4. Start command: `cd backend && java -jar target/natural-flow-1.0.0.jar`
5. Add PostgreSQL database
6. Configure same environment variables

## Troubleshooting

### "Build Failed"
- Check Railway logs for Maven errors
- Ensure Java 17 is specified in pom.xml
- Verify backend folder structure is correct

### "Database Connection Failed"
- Railway auto-provides DATABASE_URL
- Make sure PostgreSQL database is added to project
- Check `application.yml` has prod profile

### "No Data Appearing"
- Check backend logs for Polygon polling messages
- Verify POLYGON_ENABLED=true
- Check POLYGON_API_KEY is valid
- Look for "Successfully ingested X trades" messages

### "AI Insights Error"
- Verify OPENAI_API_KEY is correct
- Check OpenAI account has credits
- Look for OpenAI API errors in logs

## Next Steps After Deployment

1. **Test All Features**
   - Dashboard shows live data
   - Ticker view has position building
   - AI insights generate successfully

2. **Set Up Custom Domain** (Optional)
   - Railway supports custom domains
   - Point your domain to Railway URL

3. **Enable Monitoring**
   - Set up Railway notifications
   - Monitor Polygon API usage
   - Track OpenAI costs

4. **Scale If Needed**
   - Railway auto-scales
   - Can upgrade database size
   - Add more backend instances

## Security Notes

- API keys are stored securely in Railway's environment
- Railway encrypts environment variables
- Database is private (not exposed to internet)
- Enable API authentication if making backend public

---

**Ready to deploy?** Follow steps 1-6 above and your Natural Flow system will be live in ~20 minutes!
