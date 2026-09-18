package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.Tema; 

@Repository
public interface TemaRepository extends JpaRepository<Tema, Integer> {
    
    // 🔥 Verifica si el nombre de un tema ya existe en toda la BD (Para cuando creas)
    boolean existsByDenominacionIgnoreCase(String denominacion);
    
    // 🔥 Verifica si el nombre de un tema ya existe en OTRA unidad teológica distinta (Para cuando editas)
    boolean existsByDenominacionIgnoreCaseAndTeologia_IdTeologiaNot(String denominacion, Integer idTeologia);
}