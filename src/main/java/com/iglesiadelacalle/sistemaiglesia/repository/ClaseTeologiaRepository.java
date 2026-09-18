package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.ClaseTeologia;

@Repository
public interface ClaseTeologiaRepository extends JpaRepository<ClaseTeologia, Integer> {
    
    // 🔥 Ahora verifica que no se repita MÓDULO + TEMA en el mismo año
    boolean existsByTeologia_IdTeologiaAndTema_IdTemaAndAnio(Integer idTeologia, Integer idTema, Integer anio);
}