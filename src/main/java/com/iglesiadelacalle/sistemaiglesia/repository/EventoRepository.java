package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Evento;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventoRepository extends JpaRepository<Evento, Integer> {
    
    // ⚡ Filtra en la BD: Eventos viejos que SÍ tengan alguna imagen guardada
    @Query("SELECT e FROM Evento e WHERE e.post.fecha < :fechaLimite AND (e.flyerUrl IS NOT NULL OR e.fotoUrl IS NOT NULL)")
    List<Evento> buscarEventosAntiguosConMultimedia(@Param("fechaLimite") LocalDate fechaLimite);
}
