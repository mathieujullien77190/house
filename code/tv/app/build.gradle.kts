plugins {
    id("com.android.application")
}

android {
    namespace = "house.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "house.tv"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
