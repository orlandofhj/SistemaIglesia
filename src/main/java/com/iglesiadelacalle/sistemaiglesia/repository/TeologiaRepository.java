package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.Teologia; 

@Repository

public interface TeologiaRepository extends JpaRepository<Teologia, Integer> {
    // Verifica si ya existe el nombre al crear
    boolean existsByDenominacionIgnoreCase(String denominacion);
    
    // Verifica si ya existe el nombre al editar (excluyendo el ID actual)
    boolean existsByDenominacionIgnoreCaseAndIdTeologiaNot(String denominacion, Integer idTeologia);
}