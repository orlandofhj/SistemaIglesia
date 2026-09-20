package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.SerDominical;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SerDominicalRepository extends JpaRepository<SerDominical, Integer> {
    
    // ⚡ Filtra en la BD: Servicios viejos que SÍ tengan alguna imagen guardada
    @Query("SELECT s FROM SerDominical s WHERE s.post.fecha < :fechaLimite AND (s.flyerUrl IS NOT NULL OR s.fotoUrl IS NOT NULL)")
    List<SerDominical> buscarServiciosAntiguosConMultimedia(@Param("fechaLimite") LocalDate fechaLimite);
}
