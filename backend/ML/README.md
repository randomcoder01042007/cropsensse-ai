# Training the CropSense model for all crops

Crops: Maize, Soybean, Wheat, Rice, Cotton, Tomato, Potato, Sugarcane
("Others" = no crop filter; the model answers only if it is confident).

You need a GPU to train in reasonable time. Google Colab (free GPU) works.

## Step 1. Download the datasets
See `dataset_map.example.json` for the list (Mendeley / Zenodo / Dryad / Kaggle).
Unzip each into its own folder.

## Step 2. Merge them into one training folder with standard names
    cp ml/dataset_map.example.json ml/dataset_map.json
    # edit "path" and the folder-name keys to match what you downloaded
    python ml/prepare_dataset.py ml/dataset_map.json --out /content/plant_data

It prints how many images each class has. Add more images to any class marked "few images".

## Step 3. Train
    pip install torch torchvision pillow
    python ml/train.py --data /content/plant_data --epochs 12
    # quick smoke test first: add --epochs 1
    # many more images in some classes than others: add --class-weights

Output: `models/cropsense_model.pt`, `classes.json`, `training_report.json`.
Copy these three files into `backend/models/`.

## Step 4. Check on your own photos
Make folders named after the class and put 10-20 real phone photos in each:

    my_test_photos/Rice___Brown_spot/*.jpg
    python ml/evaluate.py my_test_photos
    python ml/evaluate.py my_test_photos --with-crop     # as the app works

## Step 5. Run
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    GET /api/health  ->  classifier.model_file_found and classifier.supported_crops

## Important
- Do not mix photo styles inside one crop. If all "healthy" images of a crop come
  from a studio dataset and all diseased ones from field photos, the model learns the
  background, not the disease. Each class should have both kinds of photos.
- The merge example uses PlantVillage only for tomato, potato and maize, and uses
  field-photo datasets for soybean, for that reason.
- Validation accuracy printed by training is optimistic (near-duplicate images across
  splits). Trust `evaluate.py` on photos you took yourself.
- New disease: add a folder `Crop___Disease`, retrain, and add its entry to
  `app/knowledge/diseases.json` (in `diseases` and `labels`).
- Environment variables: CROPSENSE_CONFIDENCE_THRESHOLD (0.70), CROPSENSE_MIN_MARGIN (0.15),
  CROPSENSE_CROP_MATCH_MIN (0.40).
