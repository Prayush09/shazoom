# deploy.sh
npm run build
gcloud compute scp --recurse ./dist/* instance-20251223-125528:~/dist-new --zone=us-central1-c
gcloud compute ssh instance-20251223-125528 --zone=us-central1-c --command="sudo rm -rf /var/www/shazoom-frontend/* && sudo mv ~/dist-new/* /var/www/shazoom-frontend/ && sudo chown -R www-data:www-data /var/www/shazoom-frontend"