import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Datos de publicación: viven en `release.properties` (ignorado por git, ver release.properties.example),
// o como propiedades de Gradle (-P) / variables de entorno con el mismo nombre. Nunca en el código.
val releaseProps = Properties().apply {
    rootProject.file("release.properties").takeIf { it.isFile }?.inputStream()?.use { load(it) }
}

fun releaseProp(name: String): String? =
    (providers.gradleProperty(name).orNull ?: System.getenv(name) ?: releaseProps.getProperty(name))
        ?.trim()?.takeIf { it.isNotEmpty() }

val apiUrlRelease: String? = releaseProp("CABLERA_API_URL")
val keystoreFile: String? = releaseProp("CABLERA_KEYSTORE_FILE")
val puedeFirmar = keystoreFile != null && rootProject.file(keystoreFile).isFile &&
    releaseProp("CABLERA_KEYSTORE_PASSWORD") != null && releaseProp("CABLERA_KEY_ALIAS") != null

android {
    namespace = "com.cablera.app"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.cablera.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (puedeFirmar) {
            create("release") {
                storeFile = rootProject.file(keystoreFile!!)
                storePassword = releaseProp("CABLERA_KEYSTORE_PASSWORD")
                keyAlias = releaseProp("CABLERA_KEY_ALIAS")
                keyPassword = releaseProp("CABLERA_KEY_PASSWORD") ?: releaseProp("CABLERA_KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            // Dispositivo físico conectado por USB: `adb reverse tcp:4000 tcp:4000` túnel al backend
            // local. Para emulador, usar en su lugar "http://10.0.2.2:4000/" (loopback del host).
            // Para probar contra un backend remoto ya desplegado, sin tocar este valor por defecto:
            // -PCABLERA_API_URL_DEBUG=https://tu-backend/ (o la misma variable de entorno).
            buildConfigField("String", "API_BASE_URL", "\"${releaseProp("CABLERA_API_URL_DEBUG") ?: "http://127.0.0.1:4000/"}\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // La URL real se inyecta al publicar (CABLERA_API_URL); sin ella el empaquetado falla (ver abajo).
            buildConfigField("String", "API_BASE_URL", "\"${apiUrlRelease ?: "https://sin-configurar.invalid/"}\"")
            if (puedeFirmar) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.datastore.preferences)

    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.print)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}

// Un build de release nunca debe salir apuntando a un servidor de mentira ni por HTTP en texto plano.
gradle.taskGraph.whenReady {
    val publicando = allTasks.any { it.project == project && (it.name == "packageRelease" || it.name == "bundleRelease") }
    if (publicando) {
        if (apiUrlRelease == null || !apiUrlRelease.startsWith("https://")) {
            throw GradleException(
                "Falta CABLERA_API_URL (https://...) para el build de release. " +
                    "Defínela en android/release.properties (ver release.properties.example) o con -PCABLERA_API_URL=...",
            )
        }
        if (!puedeFirmar) {
            logger.warn("AVISO: sin keystore configurada, el release sale SIN FIRMAR y no se puede instalar ni subir a Play.")
        }
    }
}
