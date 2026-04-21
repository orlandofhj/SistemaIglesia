package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.ClaseTeologia;

@Repository
public interface ClaseTeologiaRepository extends JpaRepository<ClaseTeologia, Integer> {
    
    // 🔥 Verifica si ya existe una clase de esta teología en el mismo año
    boolean existsByTeologia_IdTeologiaAndAnio(Integer idTeologia, Integer anio);
}