-- MySQL dump 10.13  Distrib 8.0.20, for Win64 (x86_64)
--
-- Host: localhost    Database: blog_viajes
-- ------------------------------------------------------
-- Server version	8.0.20

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `publicaciones`
--

DROP TABLE IF EXISTS `publicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `publicaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `resumen` varchar(255) NOT NULL,
  `contenido` varchar(255) NOT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `votos` int DEFAULT '0',
  `fecha_hora` timestamp NULL DEFAULT NULL,
  `autor_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_publicaciones_autores_idx` (`autor_id`),
  CONSTRAINT `fk_publicaciones_autores` FOREIGN KEY (`autor_id`) REFERENCES `autores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `publicaciones`
--

LOCK TABLES `publicaciones` WRITE;
/*!40000 ALTER TABLE `publicaciones` DISABLE KEYS */;
INSERT INTO `publicaciones` VALUES (1,'Roma','Buen viaje a Roma','Contenido',NULL,5,'2018-09-10 01:08:27',1),(2,'Grecia','Buen viaje a Grecia','Contenido',NULL,4,'2018-09-11 01:08:27',1),(3,'Paris','Buen viaje a Paris','Contenido',NULL,6,'2018-09-12 01:08:27',1),(4,'Costa Rica','Buen viaje a Costa Rica','Contenido',NULL,0,'2018-09-13 01:08:27',2),(5,'Mar de Plata','Buen viaje a Mar de Plata','Contenido',NULL,0,'2018-09-14 01:08:27',2),(6,'Guadalajara','Buen viaje a Guadalajara','Contenido',NULL,0,'2018-09-15 01:08:27',2),(7,'China','Buen viaje a China','Contenido',NULL,3,'2018-09-16 01:08:27',2),(16,'Viaje a Disney','Viaje familiar a Disney en 2016','<p>Fuimos a <strong>Disney </strong>y lo disfrutamos mucho, visitamos varios parques</p>',NULL,7,'2020-06-03 04:00:00',20),(17,'Viaje a Aruba','Vacaciones en Aruba','<p>Fuimos a <strong>Aruba </strong>y la pasamos genial, playas hermosas y siempre sol</p>',NULL,5,'2020-06-03 04:00:00',20),(18,'Viaje a Córdoba','Visita familiar','<p>Fuimos a <strong>Córdoba </strong>a visitar a mis suegros por las fiestas, comimos un rico <i>asado</i></p>',NULL,4,'2020-06-03 04:00:00',20),(20,'Viaje a Nueva York','Visita familiar','<p>Fuimos a <strong>Nueva York </strong></p>',NULL,2,'2020-06-03 04:00:00',20);
/*!40000 ALTER TABLE `publicaciones` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-06-05 10:43:26
