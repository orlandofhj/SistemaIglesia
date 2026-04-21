package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.NotaTeologia;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotaTeologiaRepository extends JpaRepository<NotaTeologia, Integer> {
    
    // Obtener todas las notas de una clase específica
    List<NotaTeologia> findByClaseTeologia_IdClaseTeologia(Integer idClaseTeologia);
    
    // Buscar la nota exacta de un alumno en un tema específico (Para actualizar / Upsert)
    Optional<NotaTeologia> findByClaseTeologia_IdClaseTeologiaAndTema_IdTemaAndEstudiante_IdPersona(
        Integer idClaseTeologia, Integer idTema, Integer idEstudiante
    );
}